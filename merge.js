var baseURL = "http://localhost:3000/parsePCAP/";
//...............................................................
function init()
{

    var xhttp = new XMLHttpRequest();
    var url = baseURL;
    url += '?';
    url += 'fileName=' + 'getTheFiles';
    xhttp.open("get", url , true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send();
    xhttp.onreadystatechange=function() {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
	    var json = JSON.parse(xhttp.response);
	    var uploadFiles = json.uploadFiles;
	    var html = '<option value="select" selected> Select one of these, or upload a new one </option>';
	    for(var i=0;i<uploadFiles.length;i++){
		if(uploadFiles[i].length>0)
		    html += '<option value="' + uploadFiles[i].trim() + '"> ' + uploadFiles[i].trim() + ' </option>';
	    }
	    document.getElementById('uploadFiles').innerHTML = html;
	}
    }

    return;   
}
//....................................................................................
function readFile(evt) 
{
    //Retrieve the first (and only!) File from the FileList object
    if(typeof evt == "undefined")
    {
	alert("Please choose a file using the file selector button.");
	document.getElementById("PCAPread").value = null;
	return;
    }
    fileList.length=0;  for(var i=0;i<evt.target.files.length;i++)fileList.push(evt.target.files[i]);
    var f = fileList[0];
    var fileName = f.name;
    callParser(fileName);
    
    return;
}
//....................................................................................
function startMerge()
{
    var files = document.getElementById('uploadFiles');
    var fileNames = [];
    for(var i=0;i<files.length;i++){
	if(files[i].selected) fileNames.push(files[i].value);
    }

    alert('The files to merge are\n ' + fileNames.toString());

    var allPackets = [];
    for(var i=0;i<fileNames.length;i++) allPackets.push({fileName: fileNames[i]});

    index = 0;
    callParser(index,allPackets);
    
    return;
}
//..........................................................................................
function callParser(index,allPackets)
{
    fileName = allPackets[index].fileName;

    var filters='none';
    var categories='none';
    var actions='none';
    var ToMacs='none';
    var FromMacs='none';
    var startAt=0;
    var endAt=-1;

    document.getElementById("status").innerHTML = "Working on it.";
    
    var xhttp = new XMLHttpRequest();
    var url = baseURL;
    url += '?';
    url += 'fileName=' + fileName;
    url += '&';
    url += 'filters=' + filters;
    url += '&';
    url += 'categories=' + categories;
    url += '&';
    url += 'actions=' + actions;
    url += '&';
    url += 'ToMacs=' + ToMacs;
    url += '&';
    url += 'FromMacs=' + FromMacs;

    url += '&';
    url += 'startAt=' + startAt;
    url += '&';
    url += 'endAt=' + endAt;

    callPcapApi(index,allPackets,url,[])

    return;
}


//.....................................................................................................

function callPcapApi(index,allPackets,url,jsonArray)
{

    var xhttp = new XMLHttpRequest();
    xhttp.open("get", url , true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send();
    xhttp.onreadystatechange=function() {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
	    document.getElementById("status").innerHTML = "Back from the API call.";	    
	    var json = JSON.parse(xhttp.response);
	    if(json.errored){
		alert(json.errorMessage);
	    }
	    else{
		jsonArray.push(json);
		if(json.more){
		    var nextPacket = json.maxPacketProcessed + 1;
		    var pnt = url.indexOf('startAt');
		    url = url.substring(0,pnt);
		    url += 'startAt='+nextPacket;
		    url += '&';
		    url += 'endAt='+maxPacketToAnalyze;
		    var message = 'There are a total of ' + json.totalPackets + ' packets.<br/>';
		    message += 'Analysis has reached up to packet ' + json.maxPacketProcessed + '.<br/>';
		    message += 'Calling the API again to process more packets.';
		    document.getElementById("status").innerHTML = message;
		    callPcapApi(index,allPackets,url,jsonArray);
		}
		else{
		    allPackets[index].packets = recombineArray(jsonArray).fields;
		    index++;
		    if(index<allPackets.length) callParser(index,allPackets);
		    else startAnalysis(allPackets);
		}
	    }
	}
    }
    
    
    return;
}
//............................................................................................................................
function recombineArray(jsonArray)
{
    var json = {};

    json.fields = [];
    if(jsonArray[0].fields){
	for(var i=0;i<jsonArray.length;i++){
	    for(var j=0;j<jsonArray[i].fields.length;j++) json.fields.push(jsonArray[i].fields[j]);
	}
    }

    return json;
}
//..........................................................................................................................
function startAnalysis(allPackets)
{
    var results = '';
    results += 'Found data from ' + allPackets.length + ' files.';
    results += '<br/>';
    for(var a=0;a<allPackets.length;a++){
	var val = a+1;
	results += 'File ' + val + ' named ' + allPackets[a].fileName + ' has ' + allPackets[a].packets.length + ' packets.';
	results += '<br/>';
    }

    //OK, try and match them up.  Since I have no ideas at the moment, just going to start with one, and look for the obvious match in the others.
    var pointers = [];
    for(var a=0;a<allPackets.length;a++)pointers.push(0);
    var same = [];
    same.matches = function(file,pn){
	var matches = [];
	for(var s=0;s<same.length;s++){
	    if(same[s].file1==file && same[s].pn1==pn)matches.push({file:same[s].file2, pn:same[s].pn2});	
	    if(same[s].file2==file && same[s].pn2==pn)matches.push({file:same[s].file1, pn:same[s].pn1});
	}
	return matches;
    }

    for(var i=0;i<allPackets[0].packets.length;i++){ //Using the first set of packets, look at each one...
	pointers[0] = i;
	allPackets[0].packets[i].matched=false;
	for(var a=1;a<allPackets.length;a++){ //Going to look for matches in all of the other files.
	    for(var j=pointers[a];j<allPackets[a].packets.length;j++){ //Starting at the last match you found, look at the rest of the packets...
		allPackets[a].packets[j].matched=false;
		var target = allPackets[0].packets[i];
		var check = allPackets[a].packets[j];
		var sameTransmitter = false;
		if(target.transmitterAddress==check.transmitterAddress) sameTransmitter = true;
		var sameReceiver = false;
		if(target.receiverAddress==check.receiverAddress) sameReceiver = true;
		var sameType = false;
		if(target.packetType==check.packetType) sameType = true;
		var sameSequenceNumber = false;
		if(target.sequenceNumber==check.sequenceNumber) sameSequenceNumber = true;
		var isTheSame = sameTransmitter && sameReceiver && sameType && sameSequenceNumber;
		if(isTheSame){
		    //results += 'File ' + 0 + ' packet ' + allPackets[0].packets[i].packetNumber + ' matches file ' + a + ' packet ' + allPackets[a].packets[j].packetNumber;
		    //results += '<br/>';
		    pointers[a] = j+1;
		    same.push({file1:0, ind1:i, file2:a, ind2:j});
		    allPackets[0].packets[i].matched=true;
		    allPackets[a].packets[j].matched=true;
		    break;
		}
	    }
	}
    }

    //Give every packet in every file a time based on the first packet in that file.
    for(var a=0;a<allPackets.length;a++){
	for(var i=0;i<allPackets[a].packets.length;i++){
	    allPackets[a].packets[i].Time = allPackets[a].packets[i].arrivalTimeSeconds - allPackets[a].packets[0].arrivalTimeSeconds;
	}
    }

    //Treat the first file as the timing reference.  So find out how every other file is related to the first file.
    same.getMatches = function(i,j){
	var matches = [];
	for(var s=0; s<same.length; s++){
	    if(same[s].file1==i && same[s].file2==j)matches.push(same[s]);
	    if(same[s].file1==j && same[s].file2==i)matches.push({file1:same[s].file2, ind1:same[s].ind2, file2:same[s].file1, ind2:same[s].ind1});
	}
	for(var i=0;i<matches.length;i++){
	    var minPacket = matches[i].pn1;
	    var index = i;
	    for(var j=i+1;j<matches.length;j++){
		if(matches[j].pn1<minPacket){
		    minPacket = matchs[j].pn1;
		    index = j;
		}
	    }
	    if(index!=i){
		var hold = matches[i];
		matches[i] = matches[index];
		matches[index] = hold;
	    }
	}
	return matches;
    }
    
    for(var a=1; a<allPackets.length; a++){
	var matches = same.getMatches(a,0);
	//Get the packets to align
	for(var m=0; m<matches.length; m++){
	    var refPacket=matches[m].ind2;
	    var refTime=allPackets[0].packets[refPacket].Time;
	    var otherPacket=matches[m].ind1;
	    var otherTime=allPackets[a].packets[otherPacket].Time;
	    var timeDelta = refTime - otherTime;
	    //Add this time Delta to every time in this file, starting with this packet.
	    for(var p=otherPacket;p<allPackets[a].packets.length;p++){
		allPackets[a].packets[p].Time += timeDelta;
	    }
	}
    }

    mergedFile = [];
    for(var a=0;a<allPackets.length;a++){
	for(var i=0;i<allPackets[a].packets.length;i++){
	    mergedFile.push({packet:allPackets[a].packets[i], file:allPackets[a].fileName});
	}
    }

    mergedFile.sort = function(){
	for(var i=0;i<mergedFile.length;i++){
	    var minTime = mergedFile[i].packet.Time;
	    var point = i;
	    for(var j=i+1;j<mergedFile.length;j++){
		if(mergedFile[j].packet.Time < minTime){
		    minTime = mergedFile[j].packet.Time;
		    point = j;
		}
	    }
	    if(point!=i){
		var holdPacket = mergedFile[i];
		mergedFile[i] = mergedFile[point];
		mergedFile[point] = holdPacket;
	    }
	}
	return;
    }

    mergedFile.sort();


    var html = '';
    html += '<table style="border: 1px solid black; border-collapse:collapse;">';
    html += '<tr style="border: 1px solid black; border-collapse:collapse;">';
    html += '<td style="border: 1px solid black; border-collapse:collapse;">Time (msec)</td>';
    html += '<td style="border: 1px solid black; border-collapse:collapse;">Packet #</td>';
    html += '<td style="border: 1px solid black; border-collapse:collapse;">Packet bytes</td>';
    html += '<td style="border: 1px solid black; border-collapse:collapse;">Transmitter Address</td>';
    html += '<td style="border: 1px solid black; border-collapse:collapse;">Receiver Address</td>';
    html += '<td style="border: 1px solid black; border-collapse:collapse;">Type</td>';
    html += '<td style="border: 1px solid black; border-collapse:collapse;">Sequence #</td>';
    html += '<td style="border: 1px solid black; border-collapse:collapse;">Source</td>';
    html += '<td style="border: 1px solid black; border-collapse:collapse;">Matched</td>';
    html += '</tr>';
    //for(var m=0;m<mergedFile.length;m++){
    for(var m=0;m<50;m++){
	html += '<tr style="border: 1px solid black; border-collapse:collapse;">';
	html += '<td style="border: 1px solid black; border-collapse:collapse;">' + (mergedFile[m].packet.Time*1000).toFixed(3) + '</td>';
	html += '<td style="border: 1px solid black; border-collapse:collapse;">' + mergedFile[m].packet.packetNumber + '</td>';
	html += '<td style="border: 1px solid black; border-collapse:collapse;">' + mergedFile[m].packet.packetBytes + '</td>';
	html += '<td style="border: 1px solid black; border-collapse:collapse;">' + mergedFile[m].packet.transmitterAddress + '</td>';
	html += '<td style="border: 1px solid black; border-collapse:collapse;">' + mergedFile[m].packet.receiverAddress + '</td>';
	html += '<td style="border: 1px solid black; border-collapse:collapse;">' + mergedFile[m].packet.packetType + '</td>';	
	html += '<td style="border: 1px solid black; border-collapse:collapse;">' + mergedFile[m].packet.sequenceNumber + '</td>';	
	html += '<td style="border: 1px solid black; border-collapse:collapse;">' + mergedFile[m].file + '</td>';
	if(mergedFile[m].packet.matched)
	    html += '<td style="border: 1px solid black; border-collapse:collapse;">' + 'Yes' + '</td>';
	else
	    html += '<td style="border: 1px solid black; border-collapse:collapse;">' + '---' + '</td>';
	html += '</tr>';
    }
    html += '</table>';
	    
	
    document.getElementById('log').innerHTML = results;
    document.getElementById('table').innerHTML = html;
    
    return;
}
