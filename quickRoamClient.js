// Initialize the chart functionality
google.load("visualization", "1", {packages: ["corechart"]});

var fileList = new Array;
var fileListPointer;
var c, ctx;
var leftSide,rightSide;
var width = 1500;
var height = 600;
var holdJson;
var qsFileName,qsMacFilter;
var theMacFilter;
//var baseURL = "http://localhost:3000/parsePCAP/";
//var baseURL = "http://54.244.182.53:8282/parsePCAP/";
var baseURL, domain, uploadURL;
//...............................................................
function init()
{
    //Get the query string
    url = window.location.href;
    domain = url.split('//')[1];
    domain = domain.split('/')[0];
    
    baseURL = 'http://' + domain + '/parsePCAP';
    //change the form action URL
    uploadURL = 'http://'+domain+'/stream';
    document.getElementById("uploadForm").action = uploadURL;
    //alert('uploadURL='+uploadURL);
    
    //alert('The url is ' + url);
    var split1 = url.split('?');
    var result = {fileName:null, macFilter:null};
    if(split1.length>1){
        var query = split1[1];
        var split2 = query.split('&');
        for(var i=0;i<split2.length;i++)
        {
            var split3 = split2[i].split('=');
            if(split3[0] == 'filename')      result.fileName = split3[1];
            if(split3[0] == 'macFilter')     result.macFilter= split3[1];
        }
    }
    //alert(JSON.stringify(result,null,2));
    qsFileName = result.fileName;
    qsMacFilter= result.macFilter;
    if(qsMacFilter != null) document.getElementById("macFilter").value = qsMacFilter;

    //Put a listener onto the file read thing.
    document.getElementById('PCAPread').addEventListener('change', readFile, false);

    c=document.getElementById("messageCanvas");
    ctx=c.getContext("2d");

    if(qsFileName!=null)
	getSelectedAndCallParser();
    else{
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
		uploadFiles.sort();
		uploadFiles.reverse();
		var html = '<option value="select" selected> Select one of these, or upload a new one </option>';
		for(var i=0;i<uploadFiles.length;i++){
		    if(uploadFiles[i].length>0)
			html += '<option value="' + uploadFiles[i].trim() + '"> ' + uploadFiles[i].trim() + ' </option>';
		}
		document.getElementById('uploadFiles').innerHTML = html;
	    }
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
    //alert('The file to parse is ' + fileName);
    document.getElementById('currentFile').innerHTML = fileName;
    document.getElementById("PCAPread").value = null;
    callParser(fileName);
    
    return;
}
//..........................................................................................
function getSelectedAndCallParser()
{

    if(qsFileName!=null)
	var fileName = qsFileName;
    else{
	var files = document.getElementById('uploadFiles');
	var fileName;
	for(var i=0;i<files.length;i++){
	    if(files[i].selected) fileName = files[i].value;
	}
    }

    alert('The file to parse is ' + fileName);
    document.getElementById('currentFile').innerHTML = fileName;
    document.getElementById("uploadFiles").value = 'select';
    callParser(fileName);
    
    return;
}
//..........................................................................................
function callParser(fileName)
{

    var selections = document.getElementById('filters');
    var filters = '';
    for(var i=0;i<selections.length;i++){
	if(selections[i].selected) filters += selections[i].value + ',';	
    }
    if(filters.length>0){
	if(filters[filters.length-1]==',') filters = filters.slice(0,filters.length-1);
    }
    if(selections[0].selected)filters='none';

    
    selections = document.getElementById('categories');
    var categories = '';
    for(var i=0;i<selections.length;i++){
	if(selections[i].selected) categories += selections[i].value + ',';	
    }
    if(categories.length>0){
	if(categories[categories.length-1]==',') categories = categories.slice(0,categories.length-1);
    }
    if(selections[0].selected)categories='none';

    selections = document.getElementById('actions');
    var actions = '';
    for(var i=0;i<selections.length;i++){
	if(selections[i].selected) actions += selections[i].value + ',';	
    }
    if(actions.length>0){
	if(actions[actions.length-1]==',') actions = actions.slice(0,actions.length-1);
    }
    if(selections[0].selected)actions='none';

    var macFilter = checkMacFilter();
    theMacFilter = macFilter;

    selections = document.getElementById('ToMacs');
    var ToMacs = '';
    for(var i=0;i<selections.length;i++){
	if(selections[i].selected) ToMacs += selections[i].value + ',';	
    }
    if(ToMacs.length>0){
	if(ToMacs[ToMacs.length-1]==',') ToMacs = ToMacs.slice(0,ToMacs.length-1);
    }
    if(selections[0].selected)ToMacs='none';
    ToMacs = macFilter;
    ToMacs='none';   //Handling this filter inside the code here, not on the API side.

    selections = document.getElementById('FromMacs');
    var FromMacs = '';
    for(var i=0;i<selections.length;i++){
	if(selections[i].selected) FromMacs += selections[i].value + ',';	
    }
    if(FromMacs.length>0){
	if(FromMacs[FromMacs.length-1]==',') FromMacs = FromMacs.slice(0,FromMacs.length-1);
    }
    if(selections[0].selected)FromMacs='none';


    
    /*/
    var xhttp = new XMLHttpRequest();
    var url = "http://localhost:3000/parsePCAP/";
    xhttp.open("post", url , true);
    xhttp.setRequestHeader("Content-type", "application/json;charset=UTF-8");
    //xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    var obj = {fileName:fileName};
    var body = JSON.stringify(obj);
    xhttp.send(body);
    xhttp.onreadystatechange=function() {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            //alert(xhttp.responseText);
	    var json = JSON.parse(xhttp.response);
	    //alert(JSON.stringify(json.fields,null,2));
	    drawMessages(json.fields);
	}
    }
    //*/

    document.getElementById("statusblink").innerHTML = "Working on it.";
    document.getElementById("status").innerHTML = "";
    
    document.getElementById("Chart").style.display = "none";
    document.getElementById('FilteredPlot').style.display = "none";    
    document.getElementById('RSSIChart').style.display = "none";
    document.getElementById('ChannelChart').style.display = "none";    
    document.getElementById('ThroughputChart').style.display = "none";
    document.getElementById('RttHist').style.display = "none";
    document.getElementById('SwitchHist').style.display = "none";
    document.getElementById('SwitchText').style.display = "none";
    document.getElementById('SwitchText').innerHTML = "*******\nRoaming analysis details here\n*******";
    document.getElementById('InterPacketGap').style.display = "none";
    document.getElementById('PacketSize').style.display = "none";
    document.getElementById('RoamingPlot').style.display = "none";
    document.getElementById('messageTable').innerHTML = 'All filtered packet information goes here';
    document.getElementById('RoamingMessages').innerHTML = 'Roaming messages go here';


    var minPacketToAnalyze = 1*document.getElementById('minPacketToAnalyze').value;    
    if(isNaN(minPacketToAnalyze))minPacketToAnalyze=0;
    var maxPacketToAnalyze = 1*document.getElementById('maxPacketToAnalyze').value;    
    if(isNaN(maxPacketToAnalyze))maxPacketToAnalyze=-1;
        
    
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
    url += 'startAt=' + minPacketToAnalyze;
    url += '&';
    url += 'endAt=' + maxPacketToAnalyze;

    callPcapApi(url,[])

    return;
}

//.....................................................................................................

function callPcapApi(url,jsonArray)
{

    //var maxPacketsToAnalyze = 1*document.getElementById('maxPacketsToAnalyze').value;
    //var packetLimit = false;
    //if(!isNaN(maxPacketsToAnalyze))packetLimit=true;

    var maxPacketToAnalyze = 1*document.getElementById('maxPacketToAnalyze').value;
    var minPacketToAnalyze = 1*document.getElementById('minPacketToAnalyze').value;    

    var xhttp = new XMLHttpRequest();
    xhttp.open("get", url , true);
    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhttp.send();
    xhttp.onreadystatechange=function() {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
	    document.getElementById("statusblink").innerHTML = "";	    
	    document.getElementById("status").innerHTML = "Back from the API call.";	    
            //alert(xhttp.responseText);
	    var json = JSON.parse(xhttp.response);
	    if(json.errored){
		alert(json.errorMessage);
	    }
	    else{
		holdJson = json;
		jsonArray.push(json);
		var totalPacketCount = 0;
		for(var j=0;j<jsonArray.length;j++) totalPacketCount += jsonArray[j].packetsProcessed;
		var maxPacketToAnalyze = 1*document.getElementById('maxPacketToAnalyze').value;    
		if(isNaN(maxPacketToAnalyze) || maxPacketToAnalyze=="")maxPacketToAnalyze = jsonArray[0].totalPackets;
		if(json.more && json.maxPacketProcessed < maxPacketToAnalyze){
		    var nextPacket = json.maxPacketProcessed + 1;
		    var pnt = url.indexOf('startAt');
		    url = url.substring(0,pnt);
		    url += 'startAt='+nextPacket;
		    url += '&';
		    url += 'endAt='+maxPacketToAnalyze;
		    var message = 'There are a total of ' + json.totalPackets + ' packets.<br/>';
		    message += 'Analysis has reached up to packet ' + json.maxPacketProcessed + '.<br/>';
		    message += 'Calling the API again to process more packets.';
		    document.getElementById("statusblink").innerHTML = message;
		    document.getElementById("status").innerHTML = "";
		    callPcapApi(url,jsonArray);
		}
		else{
		    analyzeData(jsonArray);
		}
	    }
	}
    }

    return;
}
//..........................................................................................
function analyzeData(jsonArray)
{
    var json = recombineArray(jsonArray);
    //alert(JSON.stringify(json.fields,null,2));
    /*/
      if(document.getElementById('ToMacs').length<=1){
      var macs = json.allMACs.split(',');
      var html = '<option value="none" selected> None </option>';
      for(var i=0;i<macs.length;i++){
      html += '<option value="' + macs[i].trim() + '"> ' + macs[i].trim() + ' </option>';
      }
      document.getElementById('ToMacs').innerHTML = html;
      document.getElementById('FromMacs').innerHTML = html;
      }
      var uploadFiles = json.uploadFiles;
      var html = '<option value="select" selected> Select one of these, or upload a new one </option>';
      for(var i=0;i<uploadFiles.length;i++){
      if(uploadFiles[i].length>0)
      html += '<option value="' + uploadFiles[i].trim() + '"> ' + uploadFiles[i].trim() + ' </option>';
      }
      document.getElementById('uploadFiles').innerHTML = html;
    //*/
    //drawMessages(json.fields);
    //var times = showEvents(json.mobilityEvents,{min:null, max:null});
    //writeMessages(json.fields);
    //plotFiltered(json.fields);
    //plotEvents(json.qosDataEvents,times);
    //plotEvents(json.probeResponseEvents,times);
    //plotEvents(json.blockACKEvents,times);
    //plotEvents(json.receivedByEvents,times);
    //writeMessages(json.mobilityEvents);
    //getTiming(json);
    //histogramSwitches(json,null,null,null);
    histogramSwitches2(json,null,null,null);
    //getRTT(json,null,null,null);
    //tellCSA(json);
    //showIPG(json);
    //showPacketSize(json);
    //makeRoamingPlot(json.roamingRSSIplot,json.roamingRSSItable,json.roamThisMAC);	    
    makeRoamingPlot(json.fields);	    
    //makeRoamingTable(json.roamingRSSItable,json.roamThisMAC);	    
    makeRoamingTable(json.fields);	    
    document.getElementById("statusblink").innerHTML = "";
    document.getElementById("status").innerHTML = "Done with analysis.";
    
    return;
}
//..........................................................................................
function recombineArray(jsonArray)
{
    var json = {};

    json.firstArrivalTime = jsonArray[0].firstArrivalTime;
    json.roamThisMAC = jsonArray[0].roamThisMAC;
    
    json.fields = [];
    if(jsonArray[0].fields){
	for(var i=0;i<jsonArray.length;i++){
	    for(var j=0;j<jsonArray[i].fields.length;j++) json.fields.push(jsonArray[i].fields[j]);
	}
    }


    json.roamingRSSItable = [];
    if(jsonArray[0].roamingRSSItable){
	for(var i=0;i<jsonArray.length;i++){
	    for(var j=0;j<jsonArray[i].roamingRSSItable.length;j++) json.roamingRSSItable.push(jsonArray[i].roamingRSSItable[j]);
	}
    }

    json.roamingRSSIplot = [];
    if(jsonArray[0].roamingRSSIplot){
	for(var i=0;i<jsonArray.length;i++){
	    for(var j=0;j<jsonArray[i].roamingRSSIplot.length;j++) json.roamingRSSIplot.push(jsonArray[i].roamingRSSIplot[j]);
	}
    }

    holdJson = json;
    return json;
}
//..........................................................................................
function drawMessages(list)
{

    var theHeight = c.height;
    ctx.clearRect(0,0,c.width,c.height);

    var lSide = 10;
    var rSide = width-10;

    //Draw the two side lines.
    ctx.beginPath();
    ctx.moveTo(lSide,0);
    ctx.lineTo(lSide,theHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rSide,0);
    ctx.lineTo(rSide,theHeight);
    ctx.stroke();

    //Stretch the scale so that the last time is at the bottom.
    for(var i=0;i<list.length; i++){
	list[i].scaledTime = list[i].macTimestamp - list[0].macTimestamp;
    }
    if(list.length==1)list[0].scaledTime=1;

    //Get the vertical distance for each time
    for(var i=0;i<list.length; i++){
	list[i].vertical = parseInt(list[i].scaledTime * theHeight/list[list.length-1].scaledTime);
    }

    //How many of these are too close to the bottom?
    var count = 0;
    for(var i=0;i<list.length;i++)if(theHeight-list[i].vertical<10)count++;
    if(count>0){
	for(var i=0;i<list.length; i++){
	    list[i].vertical = parseInt(list[i].scaledTime * (theHeight-count*10)/list[list.length-1].scaledTime);
	}
    }	
				     
    //setDirection(list[0]);

    var last;
    for(var i=0;i<list.length;i++){

	//var dirObj = getDirection(list[i]);
	var vertical = list[i].vertical+10;
	if(i>0) vertical = Math.max(vertical,last+10);
	
	ctx.beginPath();
	/*/
	ctx.moveTo(dirObj.from, vertical);
	ctx.lineTo(dirObj.to,   vertical);
	//*/
	ctx.moveTo(10, vertical);
	ctx.lineTo(width-10, vertical);
	ctx.stroke();
	ctx.font = "10px Arial";
	//var deltamicrosec = list[i].macTimestamp - list[0].macTimestamp;
	var deltamicrosec = list[i].macTimestamp - holdJson.firstTimestamp;
	var deltamsec = deltamicrosec/1000;
	var deltasec = deltamicrosec/1E6;
	//Or, redo this using the arrival time:
	deltasec = list[i].arrivalTimeSeconds - holdJson.firstArrivalTime;
	var timeInfo = list[i].packetNumber + ': ' + list[i].macTimestamp.toString() + '  (' + deltasec.toFixed(1) + ' sec from first)';
	//*/
	ctx.fillText('Packet: ' + list[i].packetNumber,                              width/15,   vertical);
	ctx.fillText('Timestamp: ' + list[i].macTimestamp,                         2*width/15,           vertical);
	ctx.fillText('(Delta time from first packet:  ' + deltasec.toFixed(1)+ ')',3*width/15,           vertical);
	ctx.fillText('Tx: ' + list[i].transmitterAddress,                          5*width/15,           vertical);
	ctx.fillText('Type ' + list[i].packetType,                                 6*width/15,           vertical);
	ctx.fillText('Cat ' + list[i].packetCategory,                              7*width/15,           vertical);
	ctx.fillText('Action ' + list[i].packetAction,                             8*width/15,           vertical);
	ctx.fillText('MCS ' + list[i].MCS,                                         9.5*width/15,      vertical);
	ctx.fillText('NSS ' + list[i].NSS,                                         10*width/15,      vertical);
	ctx.fillText('BW ' + list[i].BW,                                          10.5*width/15,      vertical);
	ctx.fillText('GI ' + list[i].GI,                                          11*width/15,      vertical);
	ctx.fillText('Rate ' + list[i].dataRate + ' Mbps',                        12*width/15,      vertical);
	ctx.fillText('RSSI ' + list[i].RSSI + ' dBm',                             13*width/15,      vertical);
	ctx.fillText('Rx: ' + list[i].receiverAddress,                            14*width/15,           vertical);
	//*/

	/*/
	var label = '';
	label += 'Packet: ' + list[i].packetNumber + '\t\t' + '  ';
	label += 'Timestamp: ' + list[i].macTimestamp + '\t\t' +  '  ';
	label += '(Delta time from first packet:  ' + deltasec.toFixed(1)+ ')  ' +  '\t\t';
	label += 'Tx: ' + list[i].transmitterAddress + '\t\t' +  '  ';
	label += 'Type ' + list[i].packetType + '\t\t' +  '  ';
	if(list[i].MCS>=0) label += 'MCS ' + list[i].MCS + '\t\t' +  '  ';
	if(list[i].NSS>=0) label += 'NSS ' + list[i].NSS + '\t\t' +  '  ';
	label += 'BW ' + list[i].BW + ' MHz  ' +  '\t\t';
	label += 'GI ' + list[i].GI + ' usec  ' +  '\t\t';
	label += 'Rate ' + list[i].dataRate + ' Mbps  ' +  '\t\t';
	label += 'RSSI ' + list[i].RSSI + ' dBm ' +  '\t\t';
	label += 'Rx: ' + list[i].receiverAddress + '\t\t' +  '  ';
	ctx.fillText(label,30, vertical);
	//*/

	last = vertical;
	
    }


    return;
}
//..................................................................
function writeMessages(list)
{
    if(list.length==0) return;
    
    var html = '';
    html += list.length + ' total entries' + '<br/>';
    html += '<table border="1" style="border-collapse:collapse;">';

    html += '<tr>';
    html += '<td>' + 'PacketNumber' + '</td>';
    html += '<td>' + 'Timestamp (sec)' + '</td>';
    html += '<td>' + 'Delta (sec)' + '</td>';
    html += '<td>' + 'Transmitter' + '</td>';
    html += '<td>' + 'Receiver' + '</td>';
    html += '<td>' + 'Freq (MHz)' + '</td>';
    html += '<td>' + 'Chan' + '</td>';
    html += '<td>' + 'RSSI' + '</td>';
    html += '<td>' + 'Type' + '</td>';
    html += '<td>' + 'Category' + '</td>';
    html += '<td>' + 'Action' + '</td>';
    html += '<td>' + 'MCS' + '</td>';
    html += '<td>' + 'NSS' + '</td>';
    html += '<td>' + 'BW' + '</td>';
    html += '<td>' + 'GI' + '</td>';
    html += '<td>' + 'Rate' + '</td>';
    html += '</tr>';

    for(var l=0;l<list.length;l++){
	html += '<tr>';

	var deltamicrosec = list[l].macTimestamp - holdJson.firstTimestamp;
	var deltamsec = deltamicrosec/1000;
	var deltasec = deltamicrosec/1E6;
	deltasec = list[l].arrivalTimeSeconds - holdJson.firstArrivalTime;

	var catText = '--';
	if(typeof list[l].packetCategory != 'undefined') catText = list[l].packetCategory;
	var actText = '--';
	if(typeof list[l].packetAction != 'undefined') actText = list[l].packetAction;
	
	html += '<td>' + list[l].packetNumber + '</td>';
	//html += '<td>' + list[l].macTimestamp + '</td>';
	html += '<td>' + list[l].arrivalTimeSeconds + '</td>';
	html += '<td>' + deltasec.toFixed(1) + '</td>';
	html += '<td>' + list[l].transmitterAddress + '</td>';
	html += '<td>' + list[l].receiverAddress + '</td>';
	html += '<td>' + list[l].Channel + '</td>';
	html += '<td>' + channelToNumber(list[l].Channel) + '</td>';	
	html += '<td>' + list[l].RSSI + '</td>';
	html += '<td>' + list[l].packetType + '</td>';
	html += '<td>' + catText + '</td>';
	html += '<td>' + actText + '</td>';
	html += '<td>' + list[l].MCS + '</td>';
	html += '<td>' + list[l].NSS + '</td>';
	html += '<td>' + list[l].BW + '</td>';
	html += '<td>' + list[l].GI + '</td>';
	html += '<td>' + list[l].dataRate + '</td>';
	
	html += '</tr>';
    }
    
    html += '</table>';
    document.getElementById('messageTable').innerHTML = html;
    
    return;
}
//..........................................................
function setDirection(data)
{
    leftSide = data.transmitterAddress;
    rightSide = data.receiverAddress;
    
    return;
}
//........................................................
function getDirection(data)
{
    var retObj = {};
    
    if(data.transmitterAddress==leftSide && data.receiverAddress==rightSide){
	retObj.direction = 1;
	retObj.from = 10;
	retObj.to = width-10;
    }
    else if(data.transmitterAddress==rightSide && data.receiverAddress==leftSide){
	retObj.direction = -1;
	retObj.from = width-10;
	retObj.to = 10;
    }
    else{
	retObj.direction = 0;
	retObj.from = null;
	retObj.to = null;
    }

    return retObj;
}
//............................................................................................
function printPlot(type)
{
    //The info should be stored in "holdJson"

    var text = '';

    var list = holdJson.fields;

    text += 'Packet Number, Timestamp , Delta, RSSI (dBm), Data Rate (Mbps) , Channel (MHz), Channel Number , ';
    text += 'Type , Category, Action , Transmitter , Receiver \n';
    
    for(var i=0;i<list.length;i++){
	//var deltamicrosec = list[i].macTimestamp - list[0].macTimestamp;
	var deltamicrosec = list[i].macTimestamp - holdJson.firstTimestamp;
	var deltamsec = deltamicrosec/1000;
	var deltasec = deltamicrosec/1E6;
	deltasec = list[i].arrivalTimeSeconds - holdJson.firstArrivalTime;
	var timeInfo = list[i].packetNumber + ': ' + list[i].macTimestamp.toString() + '  (' + deltasec.toFixed(1) + ' sec from first)';
	text += list[i].packetNumber + ' , ';
	text += list[i].macTimestamp + ' , ';
	text += deltasec.toFixed(1) + ' , ';
	text += list[i].RSSI + ' , '
	text += list[i].dataRate + ' , '
	text += list[i].Channel + ' , '
	text += channelToNumber(list[i].Channel) + ' , '
	text += list[i].packetType + ' , '
	text += list[i].packetCategory + ' , '
	text += list[i].packetAction + ' , '
	text += list[i].transmitterAddress + ' , ';
	text += list[i].receiverAddress;
	text += '\n';
    }
        

    if(type==0){
	console.log(text);
    }
    else if(type==1){
	var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
	saveAs(blob,"csvFile.csv");
    }
    
    return;
}

//...................................................................
function channelToNumber(channel)
{
    // channel is in MHz, and we are converting to the channel number.

    channel = 1*channel;

    var chNo;

    if(channel<3000){
	chNo = (channel-2412)/5 + 1;
    }

    else{
	chNo = (channel-5000)/5;
    }

    return chNo;
}
//.................................................................
function redraw()
{
    var timeIn = {min:null, max:null};
    if(!isNaN(document.getElementById('horizMin').value)) timeIn.min= 1*document.getElementById('horizMin').value;
    if(document.getElementById('horizMin').value.length==0) timeIn.min= null;
    if(!isNaN(document.getElementById('horizMax').value)) timeIn.max= 1*document.getElementById('horizMax').value;
    if(document.getElementById('horizMax').value.length==0) timeIn.max= null;
    var times = showEvents(holdJson.mobilityEvents,timeIn);
    writeMessages(holdJson.fields);
    //plotEvents(holdJson.qosDataEvents,times);
    //plotEvents(holdJson.probeResponseEvents,times);
    //plotEvents(holdJson.blockACKEvents,times);
    plotEvents(holdJson.receivedByEvents,times);
    
    return;
}
//.................................................................
function rehist(flag)
{
    if(flag==1){
	var histMin = null;
	if(!isNaN(document.getElementById('histMin').value)) histMin= 1*document.getElementById('histMin').value;
	if(document.getElementById('histMin').value.length==0) histMin= null;
	
	var histMax = null;    
	if(!isNaN(document.getElementById('histMax').value)) histMax= 1*document.getElementById('histMax').value;
	if(document.getElementById('histMax').value.length==0) histMax= null;
	
	var histBins = null;    
	if(!isNaN(document.getElementById('histBins').value)) histBins= 1*document.getElementById('histBins').value;
	if(document.getElementById('histBins').value.length==0) histBins= null;
	
	//histogramSwitches(holdJson,histMin,histMax,histBins);
	histogramSwitches2(holdJson,histMin,histMax,histBins);
    }

    else if(flag==2){
	var rttHistMin = null;
	if(!isNaN(document.getElementById('rttHistMin').value)) rttHistMin= 1*document.getElementById('rttHistMin').value;
	if(document.getElementById('rttHistMin').value.length==0) rttHistMin= null;
	
	var rttHistMax = null;    
	if(!isNaN(document.getElementById('rttHistMax').value)) rttHistMax= 1*document.getElementById('rttHistMax').value;
	if(document.getElementById('rttHistMax').value.length==0) histMax= null;
	
	var rttHistBins = null;    
	if(!isNaN(document.getElementById('rttHistBins').value)) rttHistBins= 1*document.getElementById('rttHistBins').value;
	if(document.getElementById('rttHistBins').value.length==0) rttHistBins= null;
	
	getRTT(holdJson,rttHistMin,rttHistMax,rttHistBins);
    }

   
    return;
}
//.................................................................
function showEvents(events,timeIn)
{
    if(events.length==0)return;
    
    document.getElementById('Chart').style.display = "block";
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Time Delta');
    data.addColumn('number' , 'Mobility Events');
    data.addColumn({type:'string', role:'style'});
    data.addRows(events.length);

    var times = {min:null, max:null};

    for(var e=0;e<events.length;e++){
	//data.setValue(e,0,events[e].macTimestamp/1E6);
	var use;
	var delta = events[e].arrivalTimeSeconds-holdJson.firstArrivalTime;
	use = delta;
	//use = events[e].packetNumber;
	data.setValue(e,0,use);
	if(events[e].packetType=='Association request')
	    data.setValue(e,1,1);
	else if(events[e].packetType=='Association response')
	    data.setValue(e,1,1.5);
	if(events[e].packetType=='Reassociation request')
	    data.setValue(e,1,3);
	else if(events[e].packetType=='Reassociation response')
	    data.setValue(e,1,3.5);
	else if(events[e].packetType=='Disassociate')
	    data.setValue(e,1,5);
	else if(events[e].packetType=='Authenticate')
	    data.setValue(e,1,6);
	else if(events[e].packetCategory=='WNM')
	    data.setValue(e,1,9);
	else if(events[e].packetAction=='BSS Transition Management Request')
	    data.setValue(e,1,12);


	if(times.min==null)times.min=use;
	else if(use<times.min)times.min=use;
	if(times.max==null)times.max=use;
	else if(use>times.max)times.max=use;
    }

    if(!isNaN(timeIn.min) && timeIn.min!=null)times.min = timeIn.min;
    if(!isNaN(timeIn.max) && timeIn.max!=null)times.max = timeIn.max;
    //times.min=102.5; times.max=103;

    var hmin = times.min;
    var hmax = times.max;
    var title = events.length + ' mobility events related to ' + holdJson.topSender;

    var chart = new google.visualization.ColumnChart(document.getElementById('Chart'));
    chart.draw(data,
	       {width: 1200, chartArea:{width:1100, left:100},  height: 340,
		title: title,
		hAxis: {direction: '1', title:'Time from start (sec)', viewWindow: {min:hmin, max:hmax}, gridlines: {count:10} },
		vAxis: {minValue:0, title:''},
		legend:{position:'top', maxLines:5}
	       });
    

    document.getElementById('horizMin').value = times.min;
    document.getElementById('horizMax').value = times.max;
    return times;
}
//.............................................
function plotFiltered(filtered)
{
    if(filtered.length==0)return;

    var selections = document.getElementById('ToMacs');
    var selected = [];
    for(var i=0;i<selections.length;i++){
	if(selections[i].selected) selected.push(selections[i].value);
    }
    selected.contains = function(x){
	var index = -1;
	for(var i=0;i<selected.length;i++){
	    if(selected[i]==x){
		index = i;
		break;
	    }
	}
	return index;
    }
    var all = [];
    for(var i=0;i<filtered.length;i++)all.push(filtered[i]);
    filtered = [];
    for(var i=0;i<all.length;i++) if(selected.contains(all[i].receiverAddress)>=0 || selected.contains('none')>=0) filtered.push(all[i]);

    //I want to plot different MAC addresses separately.  So separate out the MAC addresses.
    var macs = [];
    macs.contains = function(x){
	var index = -1;
	for(var i=0;i<macs.length;i++){
	    if(macs[i]==x){
		index = i;
		break;
	    }
	}
	return index;
    }
    //for(var i=0;i<filtered.length;i++) if(macs.contains(filtered[i].transmitterAddress)<0) macs.push(filtered[i].transmitterAddress);
    for(var i=0;i<filtered.length;i++) if(macs.contains(filtered[i].receiverAddress)<0) macs.push(filtered[i].receiverAddress);

    //For each mac address, create separate groups of data based on the channel.
    var groups = [];
    var set = [];
    for(var m=0;m<macs.length;m++){
	var previous = null;
	if(set.length>0) groups.push(set);
	set = [];
	for(var f=0;f<filtered.length;f++){
	    if(filtered[f].receiverAddress!=macs[m]) continue;
	    if(filtered[f].Channel != previous){
	    //if(false){
		if(set.length>0) groups.push(set);
		set = [];
		set.push(filtered[f]);
		previous = filtered[f].Channel;
	    }
	    else{
		set.push(filtered[f]);
	    }
	}
    }
    if(set.length>0) groups.push(set);

    if(groups.length>100)groups.length=100;
    
    document.getElementById('FilteredPlot').style.display = "block";
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Time Delta');
    for(var g=0;g<groups.length;g++){
	data.addColumn('number' , 'RSSI for packets from ' + groups[g][0].transmitterAddress + 'to ' + groups[g][0].receiverAddress);
	//data.addColumn({type:'string', role:'style'});
    }
    data.addRows(filtered.length);


    var row=0;
    for(var g=0;g<groups.length;g++){
	for(var i=0;i<groups[g].length;i++){
	    var use;
	    var delta = groups[g][i].arrivalTimeSeconds-holdJson.firstArrivalTime;
	    use = delta;
	    data.setValue(row,0,use);
	
	    data.setValue(row,g+1,groups[g][i].RSSI);
	    row++;
	}
    }

    var series = {};
    for(var g=0;g<groups.length;g++){
	if(groups[g][0].Channel<3000) series[g] = {color:'green'};
	if(groups[g][0].Channel>3000) series[g] = {color:'red'};
    }

    var title = filtered.length + ' packets selected by the filters';
    var chart = new google.visualization.LineChart(document.getElementById('FilteredPlot'));
    chart.draw(data,
	       {width: 1200, chartArea:{width:1100, left:100},  height: 340,
		title: title,
		hAxis: {direction: '1', title:'Time from start (sec)', viewWindow: {},  gridlines: {} },
		vAxis: {minValue:0, title:'RSSI (dBm)'},
		legend:{position:'top', maxLines:5},
		series: series
	       });
    return;
}
//.............................................
function plotEvents(events,times)
{
    if(events.length==0)return;
    
    document.getElementById('RSSIChart').style.display = "block";
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Time Delta');
    data.addColumn('number' , 'RSSI for all received packets');
    data.addColumn({type:'string', role:'style'});
    data.addRows(events.length);

    for(var e=0;e<events.length;e++){
	var use;
	var delta = events[e].arrivalTimeSeconds-holdJson.firstArrivalTime;
	use = delta;
	//use = events[e].packetNumber;
	data.setValue(e,0,use);
	data.setValue(e,1,events[e].RSSI);
	if(events[e].Channel<3000)data.setValue(e,2,'green');
	if(events[e].Channel>3000)data.setValue(e,2,'red');
    }

    var title = events.length + ' packets received by ' + holdJson.topSender;
    var chart = new google.visualization.ColumnChart(document.getElementById('RSSIChart'));
    chart.draw(data,
	       {width: 1200, chartArea:{width:1100, left:100},  height: 340,
		title: title,
		hAxis: {direction: '1', title:'Time from start (sec)', viewWindow: {},  gridlines: {count:10} },
		vAxis: {minValue:0, title:'RSSI (dBm)'},
		legend:{position:'top', maxLines:5}
	       });


    //Also do the plot showing the channel this guy is on.
    
    document.getElementById('ChannelChart').style.display = "block";
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Time Delta');
    data.addColumn('number' , 'Channel for all received packets');
    data.addColumn({type:'string', role:'style'});
    data.addRows(events.length);

    for(var e=0;e<events.length;e++){
	var use;
	var delta = events[e].arrivalTimeSeconds-holdJson.firstArrivalTime;
	use = delta;
	//use = events[e].packetNumber;
	data.setValue(e,0,use);
	var chanNo = channelToNumber(events[e].Channel);
	//data.setValue(e,1,events[e].Channel);
	data.setValue(e,1,chanNo);
	if(events[e].Channel<3000)data.setValue(e,2,'green');
	if(events[e].Channel>3000)data.setValue(e,2,'red');
    }

    var title = events.length + ' packets received by ' + holdJson.topSender;
    var chart = new google.visualization.LineChart(document.getElementById('ChannelChart'));
    chart.draw(data,
	       {width: 1200, chartArea:{width:1100, left:100},  height: 340,
		title: title,
		hAxis: {direction: '1', title:'Time from start (sec)', viewWindow: {},  gridlines: {count:10} },
		vAxis: {minValue:0, title:'Channel'},
		legend:{position:'top', maxLines:5}
	       });


    //Also, show the throughput on a per-packet basis, using the number of bytes and the packet duration to calculate it.
    document.getElementById('ThroughputChart').style.display = "block";
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Time Delta');
    data.addColumn('number' , 'Throughput (Mbps)');
    data.addColumn({type:'string', role:'style'});
    data.addRows(events.length);

    for(var e=0;e<events.length;e++){
	var use;
	var delta = events[e].arrivalTimeSeconds-holdJson.firstArrivalTime;
	use = delta;
	//use = events[e].packetNumber;
	data.setValue(e,0,use);
	var packetBytes = events[e].packetBytes;
	var packetBits = packetBytes*8;
	var packetMicroseconds = events[e].packetMicroseconds;
	var throughput = packetBits/packetMicroseconds;
	data.setValue(e,1,throughput);
    }

    var title = events.length + ' packets received by ' + holdJson.topSender;
    var chart = new google.visualization.LineChart(document.getElementById('ThroughputChart'));
    chart.draw(data,
	       {width: 1200, chartArea:{width:1100, left:100},  height: 340,
		title: title,
		hAxis: {direction: '1', title:'Time from start (sec)', viewWindow: {},  gridlines: {count:10} },
		vAxis: {minValue:0, title:'Throughput (Mbps)'},
		legend:{position:'top', maxLines:5}
	       });
    
    
    
    return;
}
//....................................................................................................
function getTiming(json)
{
    var log = '';
    
    var rbe = json.receivedByEvents;
    rbe = json.fields;
    if(rbe.length==0){
	log='************************<br/>No events in which to look for transition events.<br/>************************';
	document.getElementById('Logs').innerHTML = log;
	return;
    }
    
    //Loop over all received events
    for(var r=0;r<rbe.length;r++){
	if(rbe[r].packetAction != 'BSS Transition Management Request') continue;
	else{ //If this is a BSS Transition Management Request
	    //console.log('Transition Event: ' + JSON.stringify(rbe[r]));
	    var onChannel = rbe[r].Channel;
	    var atTime = rbe[r].arrivalTimeSeconds;
	    var thisPacket = rbe[r].packetNumber;
	    var fromSender = rbe[r].transmitterAddress;
	    //Now find the next received event that is NOT on the same channel
	    for(var n=r+1; n<rbe.length; n++){
		var found = false;
		if(rbe[n].Channel != onChannel){
		    //console.log('Next Event: ' + JSON.stringify(rbe[n]));
		    var newChannel = rbe[n].Channel;
		    var nextTime = rbe[n].arrivalTimeSeconds;
		    var nextPacket = rbe[n].packetNumber;
		    var nextSender = rbe[n].transmitterAddress;
		    /*
		    console.log('Transition event "' + rbe[r].packetAction + '"' + ' is packet ' + rbe[r].packetNumber +
				' on channel ' + onChannel + ' happens at time ' + atTime);
		    console.log('The event after is "' + rbe[n].packetType + '" ' + ' is packet ' + rbe[n].packetNumber +
				' on channel ' + newChannel + ' happens at time ' + nextTime);
		    console.log('The time gap is ' + ((nextTime-atTime)*1000).toFixed(2) + ' msec.');
		    */
		    var delta = (atTime-holdJson.firstArrivalTime).toFixed(4);
		    log += 'Transition event "' + rbe[r].packetAction + '"' + ' is packet ' + rbe[r].packetNumber +
				' on channel ' + onChannel + ' happens at time ' + atTime + ' which is delta time ' + delta + '<br/>';
		    var delta = (nextTime-holdJson.firstArrivalTime).toFixed(4);
		    log += 'The event after is "' + rbe[n].packetType + '" ' + ' is packet ' + rbe[n].packetNumber +
				' on channel ' + newChannel + ' happens at time ' + nextTime + ' which is delta time ' + delta + '<br/>';
		    log += 'The time gap is ' + ((nextTime-atTime)*1000).toFixed(2) + ' msec.' + '<p/>';
		    found = true;
		}
		if(found)break;
	    }
	}
    }
    if(log.length==0)log='************************<br/>No transition events identified.<br/>************************';
    document.getElementById('Logs').innerHTML = log;
    return;
}
//....................................................................................................
function getRTT(json,rttHistMin,rttHistMax,rttHistBins)
{
    var log = '';
    
    var iwe = json.involvedWithEvents;
    if(iwe.length==0)return;
    
    var ra,raLast=null,ta,taLast=null,time,timeLast;
    var minRTT=null,maxRTT=null;
    //Loop over all packets this guy is involved in.
    var RTTs = [];
    for(var i=0;i<iwe.length;i++){
	ra = iwe[i].receiverAddress;
	ta = iwe[i].transmitterAddress;
	time = iwe[i].arrivalTimeSeconds;
	if(ra==taLast && ta==raLast){
	    var deltaTime = time - timeLast;
	    deltaTime *= 1000;
	    //console.log('RTT is ' + deltaTime + ' msec');
	    RTTs.push(deltaTime);
	    if(minRTT==null)minRTT=deltaTime;
	    else minRTT = Math.min(minRTT,deltaTime);
	    if(maxRTT==null)maxRTT=deltaTime;
	    else maxRTT = Math.max(maxRTT,deltaTime);
	}
	raLast=ra;
	taLast=ta;
	timeLast=time;
    }

    if(rttHistMin != null && !isNaN(rttHistMin)) minRTT = rttHistMin;
    if(rttHistMax != null && !isNaN(rttHistMax)) maxRTT = rttHistMax;
    var bins = 10;
    if(rttHistBins != null && !isNaN(rttHistBins)) bins = rttHistBins;    

    var hist = createHistogramFrom(RTTs,bins,minRTT,maxRTT);
    document.getElementById('RttHist').style.display = "block";
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Round Trip Times (msec)');
    data.addColumn('number' , 'Histogram of round trip times');
    data.addColumn({type:'string', role:'style'});
    data.addRows(hist.length);

    for(var h=0;h<hist.length;h++){
	data.setValue(h,0,hist[h].binLabel);
	data.setValue(h,1,hist[h].binCount);
    }

    var statObj = statsOf(RTTs);

    var title = RTTs.length + ' events in which consecutive packets went to/from ' + holdJson.topSender +' \n';
    title += 'Mean = ' + statObj.mean.toFixed(2) + 'msec,  Std. Dev. = ' + statObj.sigma.toFixed(2) + 'msec,  Min = ' + (minRTT*1000).toFixed(2) + 'usec';

    var chart = new google.visualization.ColumnChart(document.getElementById('RttHist'));
    chart.draw(data,
	       {width: 1200, chartArea:{width:1100, left:100},  height: 340,
		title: title,
		hAxis: {direction: '1', title:'RTT (msec)', viewWindow: {},  gridlines: {} },
		vAxis: {minValue:0, title:'Histogram of round trip times'},
		legend:{position:'top', maxLines:5}
	       });
	
    return;
}
//......................................................................................................
function histogramSwitches(json,histMin,histMax,histBins)
{
    var rbe = json.receivedByEvents;
    if(rbe.length==0)return;
    var froms = json.topResponders;
    if(froms.length==0)return;
    
    var lastChannel=null;
    var lastTime=null;
    var lastPacket=null;
    var lastFrom=null;
    var switchTimes = [];
    var maxSwitchTime=null;
    var minSwitchTime=null;

    //If any of the topResponders don't have real addresses, remove them for the purposes of this analysis.
    for(var i=froms.length-1;i>=0;i--) if(froms[i].sourceAddress.indexOf('....')>=0) froms.splice(i,1);
    
    //Loop over all received events
    for(var r=0;r<rbe.length;r++){

	var use = false;
	if(rbe[r].packetType=='Block ACK')use=true;
	if(rbe[r].packetType=='ACK')use=true;
	if(rbe[r].packetType=='Data')use=true;
	if(rbe[r].packetType=='NULL Data')use=true;
	if(rbe[r].packetType=='QoS Data')use=true;
	if(rbe[r].packetCategory=='Block ACK')use=true;
	if(!use)continue;
	
	var onChannel = rbe[r].Channel;
	var atTime = rbe[r].arrivalTimeSeconds;
	var thisPacket = rbe[r].packetNumber;
	var fromSender = rbe[r].transmitterAddress;

	if(fromSender.indexOf("...")>=0){
	    fromSender = lastFrom;
	    continue;
	}
	
	if(lastChannel==null){
	    lastChannel=onChannel;
	    lastTime=atTime;
	    lastPacket=thisPacket;
	    lastFrom=fromSender;
	}
	//if(onChannel != lastChannel){
	if(
	    fromSender != lastFrom  && fromSender.indexOf("...")<0 && lastFrom.indexOf("...")<0
	   && (fromSender==froms[0].sourceAddress || fromSender==froms[1].sourceAddress)
	   && (lastFrom==froms[0].sourceAddress || lastFrom==froms[1].sourceAddress)
	  ){
	    var switchTime = (atTime - lastTime)*1000;
	    if(maxSwitchTime==null)maxSwitchTime=switchTime;
	    else maxSwitchTime = Math.max(maxSwitchTime,switchTime);
	    switchTimes.push(switchTime);
	    //*/
	    console.log('Switch ' + switchTimes.length + ' happens from packet ' + lastPacket + ' to packet ' + thisPacket +
			' Was from ' + lastFrom + ' now from ' + fromSender + ' after ' + switchTime + ' msec.');
	    //*/
	}
	lastChannel=onChannel;
	lastTime=atTime;
	lastPacket=thisPacket;
	lastFrom=fromSender;
    }

    var trueMax = maxSwitchTime;

    if(histMin != null && !isNaN(histMin)) minSwitchTime = histMin;
    if(histMax != null && !isNaN(histMax)) maxSwitchTime = histMax;
    var bins = 10;
    if(histBins != null && !isNaN(histBins)) bins = histBins;

    var hist = createHistogramFrom(switchTimes,bins,minSwitchTime,maxSwitchTime)

    document.getElementById('SwitchHist').style.display = "block";
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Switch Time (msec)');
    data.addColumn('number' , 'Histogram of switching time');
    data.addColumn({type:'string', role:'style'});
    data.addRows(hist.length);

    for(var h=0;h<hist.length;h++){
	data.setValue(h,0,hist[h].binLabel);
	data.setValue(h,1,hist[h].binCount);
    }

    var statObj = statsOf(switchTimes);

    var title = switchTimes.length + ' events in which packets to ' + holdJson.topSender + ' came from a different sender than the previous\n';
    title += 'Mean = ' + statObj.mean.toFixed(2) + ' Std. Dev. = ' + statObj.sigma.toFixed(2) + ' Max = ' + trueMax.toFixed(2);

    var chart = new google.visualization.ColumnChart(document.getElementById('SwitchHist'));
    chart.draw(data,
	       {width: 1200, chartArea:{width:1100, left:100},  height: 340,
		title: title,
		hAxis: {direction: '1', title:'Switch times (msec)', viewWindow: {},  gridlines: {} },
		vAxis: {minValue:0, title:'Histogram of switch times'},
		legend:{position:'top', maxLines:5}
	       });
    
    return;
}
//......................................................................................................
function histogramSwitches2(json,histMin,histMax,histBins)
{
    //Completely different algorithm.  Identify conversations using authentication request and response.

    var data = JSON.parse(JSON.stringify(json.fields));
    if(data.length==0){
	document.getElementById('SwitchText').style.display = "block";
	switchText = '<b><font size="3" color="red">No data present from which to try to find the switch (roaming) time.</font></b> <br/>';
	document.getElementById('SwitchText').innerHTML = switchText;
	return;
    }

    data.findType = function(type,ipnt){
	var location = -1;
	for(var i=ipnt;i<data.length;i++){
	    try{
		if(data[i].packetType.toLowerCase()==type.toLowerCase()){
		    location = i;
		    break;
		}
	    }
	    catch(err){
		//console.log('Data packet ' + data[i].packetNumber + ' has no packet type.');
	    }
	}
	return location;
    }
    data.packetContains = function(i,apMac,staMac){
	var direction = null;
	if(data[i].receiverAddress==apMac && data[i].transmitterAddress==staMac) direction = 'toAp';
	else if(data[i].transmitterAddress==apMac && data[i].receiverAddress==staMac) direction = 'toSta';
	return direction;
    }
    data.moveToNext = function(i){
	var ra=data[i].receiverAddress;
	var ta=data[i].transmitterAddress;
	var same = true;
	while(same && i<data.length){
	    i++;
	    if(i<data.length)
		same = (data[i].receiverAddress==ra && data[i].transmitterAddress==ta) || (data[i].receiverAddress==ta && data[i].transmitterAddress==ra);
	    else break;
	}
	return i;
    }

    var switchTimes = [];
    var maxSwitchTime=null, minSwitchTime=null;
    var switchText='';
    
    var retObj = useDataOnly(data,switchText);
    dataOnlySwitchTimes = retObj.switchTimes;
    switchText = retObj.switchText;

    //Let me get a list of all authentication packets
    var auths = [];
    var ipnt=-1;
    ipnt = data.findType('Authentication',ipnt+1);
    while(ipnt>=0){
	auths.push({pn:data[ipnt].packetNumber, ra:data[ipnt].receiverAddress, ta:data[ipnt].transmitterAddress});
	ipnt = data.findType('Authentication',ipnt+1);
    }

    //Clean up auths in case there are multiple packets sent, which is often the case.  I just want a set of auths going to and from the APs.
    var target=0;
    while(target<auths.length-1){
	while(auths[target].ra==auths[target+1].ra && auths[target].ta==auths[target+1].ta){ auths.splice(target,1); if(target>=auths.length-1)break; }
	target++;
    }

    //Even this cleaned up list can be cluttered.  Sometimes there will be an auth sequence to an AP to which the client is already authed.  That's not useful information, so
    //thin this out a bit, keeping only the unique ones.
    var authPairs = [];
    for(var i=0;i<auths.length;i+=2){
	if(i>=auths.length-1) break;
	if(auths[i].ta==auths[i+1].ra && auths[i].ra==auths[i+1].ta) authPairs.push({sta:auths[i].ta, ap:auths[i].ra, reqPn:auths[i].pn, resPn:auths[i+1].pn});
    }
    var target=0;
    while(target<authPairs.length-1){
	while(authPairs[target].sta==authPairs[target+1].sta && authPairs[target].ap==authPairs[target+1].ap){ authPairs.splice(target,1); if(target>=authPairs.length-1)break; }
	target++;
    }

    //OK, this should be a clean list.

    //Use authentication packets to identify the staMAC, and then base your switching times on that.
    switchText += '*****<br/>Based on Authentication pairs<br/>*****<br/>';
    switchText += 'The number of authentication pairs found is ' + authPairs.length + '<br/>';
    if(authPairs.length>0){

	var staMac = authPairs[0].sta;
	console.log('The STA MAC is ' + staMac);
	var apList = [];
	apList.contains = function(x){
	    var found=false;
	    for(var i=0;i<apList.length;i++){
		if(apList[i].mac==x){
		    found = true;
		    break;
		}
	    }
	    return found;
	}
	for(var i=0;i<authPairs.length;i++) apList.push({mac:authPairs[i].ap, pn:authPairs[i].reqPn});

	switchText += 'The STA MAC found from authentication pairs is ' + staMac + '<br/>';
	console.log('The list of APs this STA attaches to is ' + JSON.stringify(apList));
	
	//Make a list of packets that include only this staMac and one of these APs.
	var hold = [];
	for (var i=0;i<data.length;i++){
	    if(data[i].transmitterAddress==staMac && apList.contains(data[i].receiverAddress) ||
	       data[i].receiverAddress==staMac && apList.contains(data[i].transmitterAddress)) hold.push(data[i]);
	}
	data.length = 0;  for(var i=0;i<hold.length;i++) data.push(hold[i]);
	console.log(data.length + ' packets that have our sta MAC and one of the target AP MACs.');
	
	//If all is correct, this file should be made up of pairs that match up with our apList file.  So, check this out by making sure that the first packet is correct.
	var direction = null;
	for(var i=0;i<apList.length;i++){
	    direction=data.packetContains(0,apList[i].mac,staMac);
	    if(direction!=null)break;
	}
	var proceed = false;
	if(direction!=null){ proceed=true; console.log('Good first check on our file.');}
	else console.log('We have a problem here.');
	
	if(proceed){
	    //Remove packet types that are not useful for determining roam time.  One clear one is the Probe response.
	    for(var i=data.length-1;i>=0;i--) if(data[i].packetType=="Probe response") data.splice(i,1);
	    console.log(data.length + ' packets that have the MACs, but do not include Probe responses.');
	    //switchText += data.length + ' packets that have the MACs, but do not include Probe responses.' + '<br/>';
	    for(var i=data.length-1;i>=0;i--) if(data[i].packetType=="Probe request") data.splice(i,1);
	    console.log(data.length + ' packets that have the MACs, but do not include Probe requests.');
	    //switchText += data.length + ' packets that have the MACs, but do not include Probe requests.' + '<br/>';
	    for(var i=data.length-1;i>=0;i--) if(data[i].packetType=="Disassociate") data.splice(i,1);
	    console.log(data.length + ' packets that have the MACs, but do not include Disassociate.');
	    //switchText += data.length + ' packets that have the MACs, but do not include Disassociate.' + '<br/>';
	    for(var i=data.length-1;i>=0;i--) if(data[i].packetType=="EAPOL") data.splice(i,1);
	    console.log(data.length + ' packets that have the MACs, but do not include EAPOL.');
	    //switchText += data.length + ' packets that have the MACs, but do not include EAPOL.' + '<br/>';
	    for(var i=data.length-1;i>=0;i--) if(data[i].packetType=="Authentication") data.splice(i,1);
	    console.log(data.length + ' packets that have the MACs, but do not include Authentication.');
	    //switchText += data.length + ' packets that have the MACs, but do not include Authentication.' + '<br/>';
	    for(var i=data.length-1;i>=0;i--) if(data[i].packetType=="Action frames") data.splice(i,1);
	    console.log(data.length + ' packets that have the MACs, but do not include Action frames.');
	    //switchText += data.length + ' packets that have the MACs, but do not include Action frames.' + '<br/>';
	    for(var i=data.length-1;i>=0;i--) if(data[i].packetType=="Association request") data.splice(i,1);
	    console.log(data.length + ' packets that have the MACs, but do not include Association requests.');
	    //switchText += data.length + ' packets that have the MACs, but do not include Association requests.' + '<br/>';
	    for(var i=data.length-1;i>=0;i--) if(data[i].packetType=="Association response") data.splice(i,1);
	    console.log(data.length + ' packets that have the MACs, but do not include Association responses.');
	    //switchText += data.length + ' packets that have the MACs, but do not include Association responses.' + '<br/>';
	    
	    
	    var dPoint=0;
	    while(dPoint<data.length){
		dPoint=data.moveToNext(dPoint);
		if(dPoint<data.length){
		    var lastTime = data[dPoint-1].arrivalTimeSeconds;
		    var thisTime = data[dPoint].arrivalTimeSeconds;
		    var switchTime = (thisTime - lastTime)*1000;
		    if(maxSwitchTime==null)maxSwitchTime=switchTime;
		    else maxSwitchTime = Math.max(maxSwitchTime,switchTime);
		    if(minSwitchTime==null)minSwitchTime=switchTime;
		    else minSwitchTime = Math.min(minSwitchTime,switchTime);
		    switchTimes.push(switchTime);
		    
		    var logText= 'AP switch at PN ' + data[dPoint].packetNumber;
		    logText += ' Previous packet (' + data[dPoint-1].packetNumber + ') was ' + data[dPoint-1].packetType + ', ' + data[dPoint-1].transmitterAddress + ' --> ' + data[dPoint-1].receiverAddress;
		    logText += ' This packet (' + data[dPoint].packetNumber + ') is ' + data[dPoint].packetType + ', ' + data[dPoint].transmitterAddress + ' --> ' + data[dPoint].receiverAddress;
		    logText += ' Switch time is ' + switchTime.toFixed(1) + ' msec.';
		    logText += '\n';
		    console.log(logText);
		    switchText += logText.replace('\n','<br/>');
		    
		}
	    }
	}
    }
    
    //Also, look for specific patterns.  Start with this one:
    // Reassociation request, followed by QoS Data to the same AP
    switchText += '*****<br/>802.11r pattern of Reassociation request followed by QoS Data to the same AP<br/>*****<br/>';
    var idx = 0;
    while(idx>=0){
	var rrLoc = data.findType('Reassociation request',idx);
	if(rrLoc>=idx){
	    qdLoc = data.findType('QoS Data',rrLoc);
	    if(qdLoc>rrLoc){
		if(data[rrLoc].transmitterAddress==data[qdLoc].transmitterAddress && data[rrLoc].receiverAddress==data[qdLoc].receiverAddress){
		    var lastTime = data[rrLoc].arrivalTimeSeconds;
		    var thisTime = data[qdLoc].arrivalTimeSeconds;
		    var switchTime = (thisTime - lastTime)*1000;
		    if(maxSwitchTime==null)maxSwitchTime=switchTime;
		    else maxSwitchTime = Math.max(maxSwitchTime,switchTime);
		    if(minSwitchTime==null)minSwitchTime=switchTime;
		    else minSwitchTime = Math.min(minSwitchTime,switchTime);
		    switchTimes.push(switchTime);
		    
		    var logText= 'Likely 802.11r switch at PN ' + data[rrLoc].packetNumber;
		    logText += ' First packet (' + data[rrLoc].packetNumber + ') was ' + data[rrLoc].packetType + ', ' + data[rrLoc].transmitterAddress + ' --> ' + data[rrLoc].receiverAddress;
		    logText += ' Second packet (' + data[qdLoc].packetNumber + ') is ' + data[qdLoc].packetType + ', ' + data[qdLoc].transmitterAddress + ' --> ' + data[qdLoc].receiverAddress;
		    logText += ' Switch time is ' + switchTime.toFixed(1) + ' msec.';
		    logText += '\n';
		    console.log(logText);
		    switchText += logText.replace('\n','<br/>');
		    idx = qdLoc;
		}
		else{
		    idx = Math.max(rrLoc,qdLoc);
		}
	    }
	    else idx = -1;
	}
	else idx = -1;
    }

    //Also, use the data-only switch times if you have them
    for(var i=0;i<dataOnlySwitchTimes.length;i++){
	var switchTime = dataOnlySwitchTimes[i];
	if(maxSwitchTime==null)maxSwitchTime=switchTime;
	else maxSwitchTime = Math.max(maxSwitchTime,switchTime);
	if(minSwitchTime==null)minSwitchTime=switchTime;
	else minSwitchTime = Math.min(minSwitchTime,switchTime);
	switchTimes.push(switchTime);
    }

    if(switchTimes.length==0){
	document.getElementById('SwitchText').style.display = "block";
	switchText += '<b><font size="3" color="red">No data to use to calculate the switch (roaming) time.</font></b> <br/>';
    }

    else{
    
	var trueMax = maxSwitchTime;
	var trueMin = minSwitchTime;

	var likelyMin = null;
	for(var i=0;i<switchTimes.length;i++){
	    if(likelyMin==null && switchTimes[i]>20) likelyMin=switchTimes[i];
	    else
		if(switchTimes[i]<likelyMin && switchTimes[i]>20) likelyMin=switchTimes[i];
	}
	
	switchText += '<b><font size="3" color="red">The upper limit on switching time is the smallest roam event we see, which is ' + trueMin.toFixed(2) + ' msec.</font></b> <br/>';
	if(trueMin!=likelyMin && likelyMin!=null)
	    switchText += '<b><font size="3" color="red">But the likely minimum switch time is ' + likelyMin.toFixed(2) + ' msec.</font></b> <br/>';
	
	if(histMin != null && !isNaN(histMin)) minSwitchTime = histMin;
	if(histMax != null && !isNaN(histMax)) maxSwitchTime = histMax;
	var bins = 10;
	if(histBins != null && !isNaN(histBins)) bins = histBins;
	
	var hist = createHistogramFrom(switchTimes,bins,minSwitchTime,maxSwitchTime)
	
	document.getElementById('SwitchHist').style.display = "block";
	document.getElementById('SwitchText').style.display = "block";
	document.getElementById('SwitchText').innerHTML = switchText;
	var data = new google.visualization.DataTable();
	data.addColumn('number', 'Switch Time (msec)');
	data.addColumn('number' , 'Histogram of switching time');
	data.addColumn({type:'string', role:'style'});
	data.addRows(hist.length);
	
	for(var h=0;h<hist.length;h++){
	    data.setValue(h,0,hist[h].binLabel);
	    data.setValue(h,1,hist[h].binCount);
	}
	
	var statObj = statsOf(switchTimes);
	
	//var title = switchTimes.length + ' events in which packets to ' + holdJson.topSender + ' came from a different sender than the previous\n';
	var title = switchTimes.length + ' events in which packets to ' + staMac + ' came from a different sender than the previous\n';
	title += 'Mean = ' + statObj.mean.toFixed(2) + ' Std. Dev. = ' + statObj.sigma.toFixed(2) + ' Max = ' + trueMax.toFixed(2);
	
	var chart = new google.visualization.ColumnChart(document.getElementById('SwitchHist'));
	chart.draw(data,
		   {width: 1200, chartArea:{width:1100, left:100},  height: 340,
		    title: title,
		    hAxis: {direction: '1', title:'Switch times (msec)', viewWindow: {},  gridlines: {} },
		    vAxis: {minValue:0, title:'Histogram of switch times'},
		    legend:{position:'top', maxLines:5}
		   });
    }
    
    return;
}
//...................................................................................................
function useDataOnly(datIn,switchText)
{
    switchText += '*****<br/>Data Only Results<br/>*****<br/>';

    var data=[];
    //Look at data packets and base roaming time calculations on them.

    //First, remove everything from this "data" array that is not a data packet.  Or an ACK Request.
    for(var i=0;i<datIn.length;i++){
	try{
	    if(datIn[i].packetType.indexOf('Data')>=0 ||
	       datIn[i].packetType.indexOf('ACK Request')>=0
	      )
		data.push(datIn[i]);
	    //if(datIn[i].packetType=='QoS Data') data.push(datIn[i]);
	}
	catch(err){
	    //console.log('There is a packet type error for packet ' + datIn[i].packetNumber + ', showing ' + datIn[i].packetType);
	}
    }

    data.countPartners = function(mac1){
	var partners = [];
	for(var i=0;i<data.length;i++){
	    if(data[i].transmitterAddress==mac1){
		if(!partners.includes(data[i].receiverAddressd))partners.push(data[i].receiverAddress);
	    }
	    if(data[i].receiverAddress==mac1){
		if(!partners.includes(data[i].transmitterAddress))partners.push(data[i].transmitterAddress);
	    }
	}
	return partners;
    }
    

    var fromMACs=[], toMACs=[];
    fromMACs.contains=function(x){
	var found=-1;
	for(var i=0;i<fromMACs.length;i++){
	    if(fromMACs[i].mac==x){
		found=i;
		break;
	    }
	}
	return found;
    }
    fromMACs.max = function(){
	var index=null, val=null;
	for(var i=0;i<fromMACs.length;i++){
	    if(index==null){index=i; val=fromMACs[i].count;}
	    if(fromMACs[i].count>val){index=i; val=fromMACs[i].count;}
	}
	return index;
    }
    toMACs.contains=function(x){
	var found=-1;
	for(var i=0;i<toMACs.length;i++){
	    if(toMACs[i].mac==x){
		found=i;
		break;
	    }
	}
	return found;
    }
    toMACs.max = function(){
	var index=null, val=null;
	for(var i=0;i<toMACs.length;i++){
	    if(index==null){index=i; val=toMACs[i].count;}
	    if(toMACs[i].count>val){index=i; val=toMACs[i].count;}
	}
	return index;
    }

    /*/
    for(var i=0;i<data.length;i++){
	var idx = fromMACs.contains(data[i].transmitterAddress);
	if(idx<0)fromMACs.push({mac:data[i].transmitterAddress, count:1});
	else fromMACs[idx].count++;
	
	var idx = toMACs.contains(data[i].receiverAddress);
	if(idx<0)toMACs.push({mac:data[i].receiverAddress, count:1});
	else toMACs[idx].count++;
    }
    //*/

    //Make a reduced list of packets, trying to elimate any packets that would only be useful for identifying an AP, like Beacons
    var dato=[];
    for(var i=0;i<datIn.length;i++){
	if(datIn[i].packetType=='Beacon')continue;
	if(datIn[i].packetType=='Probe response')continue;
	if(datIn[i].packetType=='Association response')continue;
	if(typeof datIn[i].transmitterAddress == 'undefined')continue;
	if(typeof datIn[i].receiverAddress == 'undefined')continue;
	if(datIn[i].receiverAddress == '00.00.00.00.00.00.')continue;
	if(datIn[i].receiverAddress == 'ff.ff.ff.ff.ff.ff.')continue;
	dato.push(datIn[i]);
    }
    for(var i=0;i<dato.length;i++){
	//var use = dato[i].transmitterAddress;
	var use = dato[i].sourceAddress;
	var idx = fromMACs.contains(use);
	if(idx<0)fromMACs.push({mac:use, count:1});
	else fromMACs[idx].count++;

	//var use = dato[i].receiverAddress;
	var use = dato[i].destinationAddress;
	var idx = toMACs.contains(use);
	if(idx<0)toMACs.push({mac:use, count:1});
	else toMACs[idx].count++;
    }

    var mostTo = toMACs.max();
    var maxTo = toMACs[mostTo].mac;
    var max1 = toMACs[mostTo].count;
    var mostFrom = fromMACs.max();
    var maxFrom = fromMACs[mostFrom].mac;
    var max2 = fromMACs[mostFrom].count;

    var staMAC=null;
    var staIs=null;  //source or sink of traffic

    //console.log('The MAC receiving the most traffic is ' + maxTo + ' with a total of ' + max1 + '. This is item ' + mostTo + ' BTW.');
    var mostToPartners = data.countPartners(maxTo);
    //console.log('The number of partners that ' + maxTo + ' is dealing with is ' + mostToPartners.length);
    var countAReq=0; for(var i=0;i<datIn.length;i++) if(typeof datIn[i].packetType != 'undefined') if(datIn[i].packetType=='Association request' && datIn[i].transmitterAddress==maxTo) countAReq++;
    //console.log('The number of association requests being sent by ' + maxTo + ' is ' + countAReq);
    var countBeacons=0; for(var i=0;i<datIn.length;i++) if(typeof datIn[i].packetType != 'undefined') if(datIn[i].packetType=='Beacon' && datIn[i].transmitterAddress==maxTo) countBeacons++;
    //console.log('The number of beacons being sent by ' + maxTo + ' is ' + countBeacons);
    if(countBeacons==0){
	staMAC = maxTo;
	staIs = 'sink';
    }
    
    //console.log('The MAC sending the most traffic is ' + maxFrom + ' with a total of ' + max2 + '. This is item ' + mostFrom + ' BTW.');
    var mostFromPartners = data.countPartners(maxFrom);
    //console.log('The number of partners that ' + maxFrom + ' is dealing with is ' + mostFromPartners.length);
    var countAReq=0; for(var i=0;i<datIn.length;i++) if(typeof datIn[i].packetType != 'undefined') if(datIn[i].packetType=='Association request' && datIn[i].transmitterAddress==maxFrom) countAReq++;
    //console.log('The number of association requests being sent by ' + maxFrom + ' is ' + countAReq);
    var countBeacons=0; for(var i=0;i<datIn.length;i++) if(typeof datIn[i].packetType != 'undefined') if(datIn[i].packetType=='Beacon' && datIn[i].transmitterAddress==maxFrom) countBeacons++;
    //console.log('The number of beacons being sent by ' + maxFrom + ' is ' + countBeacons);
    if(countBeacons==0){
	staMAC = maxFrom;
	staIs = 'source';
    }

    //Let's try another way to decide if the STA is the source or the sink of the traffic.  Now that we think we know the STA MAC address, let's count the number of QoS Data packets
    //for which it is the sender, and for which it is the receiver.
    var countSource=0;
    for(var i=0;i<data.length;i++) if(data[i].transmitterAddress==staMAC)countSource++;
    var countSink=0;
    for(var i=0;i<data.length;i++) if(data[i].receiverAddress==staMAC)countSink++;
    if(countSource>countSink) staIs = 'source';
    if(countSource<countSink) staIs = 'sink';

    console.log('The STA MAC address from data-only is ' + staMAC);
    switchText += 'The STA MAC address from data-only is ' + staMAC + '<br/>';
    console.log('The STA is the ' + staIs + ' of the traffic.');
    switchText += 'The STA is the ' + staIs + ' of the traffic. ' + '<br/>';
    var apList = [];
    apList.contains = function(x){
	var found=false;
	for(var i=0;i<apList.length;i++){
	    if(apList[i].mac==x){
		found = true;
		break;
	    }
	}
	return found;
    }
    if(staMAC==maxTo) apList=mostToPartners;
    if(staMAC==maxFrom) apList=mostFromPartners;
    //console.log('The list of APs this STA attaches to is ' + JSON.stringify(apList));

    /*/  Or, let's not.  This doesn't seem like a great idea anymore.
    //Let's make a filtered list of packets that only involve this STA as either source or sink, depending.
    for(var i=data.length-1;i>=0;i--){
	if(staIs=='source' && data[i].transmitterAddress!=staMAC) data.splice(i,1);
	else if(staIs=='sink' && data[i].receiverAddress!=staMAC) data.splice(i,1);
    }

    console.log('The number of packets that have STA ' + staMAC + ' as the ' + staIs + ' of traffic is ' + data.length);
    switchText += 'The number of packets that have STA ' + staMAC + ' as the ' + staIs + ' of traffic is ' + data.length + '<br/>';
    //*/

    //Also, let's only use packets in which the source address is the same as the transmitter address, and the receiver address is the same as the destination address.  Try and keep packets going to
    //intermediate devices from messing up this analysis.
    for(var i=data.length-1;i>=0;i--){
	if(data[i].transmitterAddress!=data[i].sourceAddress || data[i].receiverAddress!=data[i].destinationAddress) data.splice(i,1);
    }
    
    console.log('The number of these packets that have the same T/S and R/D is ' + data.length);
    switchText += 'The number of these packets that have the same T/S and R/D is ' + data.length + '<br/>';

    //OK, so now that you know which is the STA, you can look at the data[] array, which at this point only has "data" packets in it, and find roaming times based on changes from one AP to the next.
    data.moveToNext = function(i){
	var ra=data[i].receiverAddress;
	var ta=data[i].transmitterAddress;
	var same = true;
	while(same && i<data.length){
	    i++;
	    if(i<data.length)
		same = (data[i].receiverAddress==ra && data[i].transmitterAddress==ta) || (data[i].receiverAddress==ta && data[i].transmitterAddress==ra);
	    else break;
	}
	return i;
    }

    var switchTimes = [];

    if(data.length!=0){

	var i=0;
	i = data.moveToNext(i);
	while(i<data.length){
	    var j=i-1;
	    var lastTime = data[j].arrivalTimeSeconds;
	    var thisTime = data[i].arrivalTimeSeconds;
	    var switchTime = (thisTime - lastTime)*1000;	
	    var logText= 'Switch happens at PN ' + data[j].packetNumber;
	    logText += ' First packet (' + data[j].packetNumber + ') was ' + data[j].packetType + ', ' + data[j].transmitterAddress + ' --> ' + data[j].receiverAddress;
	    logText += ' Second packet (' + data[i].packetNumber + ') is ' + data[i].packetType + ', ' + data[i].transmitterAddress + ' --> ' + data[i].receiverAddress;
	    logText += ' Switch time is ' + switchTime.toFixed(1) + ' msec.';
	    logText += '\n';
	    console.log(logText);
	    switchText += logText.replace('\n','<br/>');
	    switchTimes.push(switchTime);
	    i = data.moveToNext(i);
	}
    }	    
    
    return {switchTimes:switchTimes, switchText:switchText};
}
//...................................................................................................
function tellCSA(json)
{
    var text = '';
    var cs = json.channelSwitches;
    if(cs.length==0)return;

    for(var i=0;i<cs.length;i++){
	text += 'Channel switch in packet ' + cs[i].packetNumber + ' sending devices from channel ' + cs[i].csa.from + ' to channel ' + cs[i].csa.to + '\n';
    }

    alert(text);
    
    return;
}
//...................................................................................................
function showIPG(json)
{
    var allPackets = json.allPackets;


    document.getElementById('InterPacketGap').style.display = "block";
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Packet Number');
    data.addColumn('number' , 'Gap from last packet, msec');
    data.addColumn({type:'string', role:'style'});
    data.addRows(allPackets.length-1);
    
    var lastTime = allPackets[0].arrivalTimeSeconds;
    for(var i=1;i<allPackets.length;i++){
	var time = allPackets[i].arrivalTimeSeconds;
	var ipg = time - lastTime;
	ipg *= 1000;
	data.setValue(i-1,0,i);	
	data.setValue(i-1,1,ipg);	
	lastTime = time;
    }

    var title = 'InterPacket Gap';
    var chart = new google.visualization.ColumnChart(document.getElementById('InterPacketGap'));
    chart.draw(data,
	       {width: 1200, chartArea:{width:1100, left:100},  height: 340,
		title: title,
		hAxis: {direction: '1', title:'Packet Number', viewWindow: {},  gridlines: {} },
		vAxis: {minValue:0, title:'Interpacket Gap (msec)'},
		legend:{position:'top', maxLines:5}
	       });
    

    return;
}
//...................................................................................................
function showPacketSize(json)
{
    var allPackets = json.allPackets;


    document.getElementById('PacketSize').style.display = "block";
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Packet Number');
    data.addColumn('number' , 'Packet Size');
    data.addColumn({type:'string', role:'style'});
    data.addRows(allPackets.length);
    
    for(var i=0;i<allPackets.length;i++){
	var delta = allPackets[i].arrivalTimeSeconds-holdJson.firstArrivalTime;
	delta *= 1000;
	var size = allPackets[i].packetBytes;
	data.setValue(i,0,delta);	
	data.setValue(i,1,size);	
    }

    var title = 'Packet Size';
    var chart = new google.visualization.ColumnChart(document.getElementById('PacketSize'));
    chart.draw(data,
	       {width: 1200, chartArea:{width:1100, left:100},  height: 340,
		title: title,
		hAxis: {direction: '1', title:'Time from start (ms)', viewWindow: {},  gridlines: {} },
		vAxis: {minValue:0, title:'Packet Size (bytes)'},
		legend:{position:'top', maxLines:5}
	       });
    

    return;
}
//...................................................................................................
function makeRoamingPlot(allPackets)
{

    var groupByMac = true;

    var roamThisMAC = theMacFilter;

    var rssiEvents = doRoamingPlotFilters(allPackets,roamThisMAC);        
    var tableEvents = doRoamingTableFilters(allPackets,roamThisMAC);  
    
    document.getElementById('suggest').innerHTML = "";
    document.getElementById('RoamingPlot').style.display = "block";
    document.getElementById('RoamingPlot').innerHTML = "Plot will appear here, if there is any data.";
    if(rssiEvents.length==0){
	var ordered = orderReceive(holdJson.fields);
	var text = "There is no data to make this roaming plot.";
	text += '<br/>';
	text += 'Is there any chance that you wanted to use one of these MAC addresses instead? <br/>';
	for(var i=0;i<Math.min(ordered.length,5);i++) text += ordered[i].receiverAddress + '<br/>';
	document.getElementById('RoamingPlot').innerHTML = text;
	return;
    }

    var all = [];
    for(var i=0;i<rssiEvents.length;i++)all.push(rssiEvents[i]);
    rssiEvents = [];
    for(var i=0;i<all.length;i++) if(all[i].receiverAddress == roamThisMAC) rssiEvents.push(all[i]);

    if(rssiEvents.length==0){
	var ordered = orderReceive(holdJson.fields);
	var text = "There is no data to make this roaming plot.";
	text += '<br/>';
	text += 'Is there any chance that you wanted to use one of these MAC addresses? <br/>';
	for(var i=0;i<Math.min(ordered.length,5);i++) text += ordered[i].receiverAddress + '<br/>';
	document.getElementById('suggest').innerHTML = text;
    }
    

    //I want to plot different MAC addresses separately.  So separate out the MAC addresses.
    var macs = [];
    macs.contains = function(x){
	var index = -1;
	for(var i=0;i<macs.length;i++){
	    if(macs[i]==x){
		index = i;
		break;
	    }
	}
	return index;
    }
    for(var i=0;i<rssiEvents.length;i++) if(macs.contains(rssiEvents[i].receiverAddress)<0) macs.push(rssiEvents[i].receiverAddress);
    var bssIDs = [];
    bssIDs.contains = function(x){
	var index = -1;
	for(var i=0;i<bssIDs.length;i++){
	    if(bssIDs[i]==x){
		index = i;
		break;
	    }
	}
	return index;
    }
    for(var i=0;i<rssiEvents.length;i++) if(bssIDs.contains(rssiEvents[i].bssID)<0) bssIDs.push(rssiEvents[i].bssID);

    if(groupByMac){
    //For each mac address, create separate groups of data based on the channel.
    var groups = [];
    var set = [];
    for(var m=0;m<macs.length;m++){
	var previous = null;
	if(set.length>0) groups.push(set);
	set = [];
	for(var f=0;f<rssiEvents.length;f++){
	    if(rssiEvents[f].receiverAddress!=macs[m]) continue;
	    if(rssiEvents[f].Channel != previous){
	    //if(false){
		if(set.length>0) groups.push(set);
		set = [];
		set.push(rssiEvents[f]);
		previous = rssiEvents[f].Channel;
	    }
	    else{
		set.push(rssiEvents[f]);
	    }
	}
    }
    if(set.length>0) groups.push(set);
    if(groups.length>100)groups.length=100;
    }

    else{    
    //For each BSSID, create separate groups of data
    var groups = [];
    var set = [];
    for(var b=0;b<bssIDs.length;b++){
	set = [];
	for(var f=0;f<rssiEvents.length;f++){
	    if(rssiEvents[f].bssID!=bssIDs[b]) continue;
	    set.push(rssiEvents[f]);
	}
	groups.push(set);
    }
    if(groups.length>100)groups.length=100;
    }
    
    document.getElementById('RoamingPlot').style.display = "block";
    var data = new google.visualization.DataTable();
    data.addColumn('number', 'Time Delta');
    for(var g=0;g<groups.length;g++){
	if(groupByMac)
	    data.addColumn('number' , 'RSSI for packets from ' + groups[g][0].transmitterAddress + 'to ' + groups[g][0].receiverAddress);
	else
	    data.addColumn('number' , 'RSSI for packets from BSSID ' + groups[g][0].bssID);	    
	data.addColumn({type: 'string', role: 'tooltip'});
    }
    data.addColumn('number' , 'RSSI for roaming packets');
    data.addColumn({type: 'string', role: 'tooltip'});
    data.addRows(rssiEvents.length + tableEvents.length);


    var row=0;
    for(var g=0;g<groups.length;g++){
	for(var i=0;i<groups[g].length;i++){
	    var use;
	    var delta = groups[g][i].arrivalTimeSeconds-holdJson.firstArrivalTime;
	    use = delta;
	    data.setValue(row,0,use);

	    var step = 2*g;
	    data.setValue(row,step+1,groups[g][i].RSSI);
	    /*/
	    data.setValue(row,step+2,'Packet #: ' + groups[g][i].packetNumber + ', Arrival time: ' + delta.toFixed(3) + ', RSSI: ' +
			  groups[g][i].RSSI + ', Channel: ' + channelToNumber(groups[g][i].Channel));
	    //*/
	    data.setValue(row,step+2,'Packet #: ' + groups[g][i].packetNumber + ', From MAC: ' + groups[g][i].transmitterAddress + ' RSSI: ' + 
			  groups[g][i].RSSI + ' dBm, Channel: ' + channelToNumber(groups[g][i].Channel) + ' BSSID: ' + groups[g][i].bssID);
	    row++;
	}
    }

    //*/
    var all = [];
    for(var i=0;i<tableEvents.length;i++)all.push(tableEvents[i]);
    tableEvents = [];
    for(var i=0;i<all.length;i++) if(all[i].receiverAddress == roamThisMAC || all[i].transmitterAddress == roamThisMAC) tableEvents.push(all[i]);
    //*/

    //*/
    for(var t=0;t<tableEvents.length;t++){
	var use;
	var delta = tableEvents[t].arrivalTimeSeconds-holdJson.firstArrivalTime;
	use = delta;
	data.setValue(row,0,use);
	
	var step = 2*(groups.length);
	data.setValue(row,step+1,tableEvents[t].RSSI);
	
	data.setValue(row,step+2,'Roaming Control Packet #' + tableEvents[t].packetNumber + ': ' + tableEvents[t].packetType);
	
	row++;
    }
    //*/

    var colors = ['green', 'red', 'black', 'orange', 'yellow', 'gray'];
    colors.length = 4;
    
    var series = {};
    if(groupByMac){
	for(var g=0;g<groups.length;g++){
	    var pick = g % colors.length;
	    var color = colors[pick];
	    var lineWidth, pointShape, pointSize;
	    if(groups[g][0].Channel<3000){
		lineWidth = 1;
		pointShape = 'circle';
		pointSize = 5;
	    }
	    if(groups[g][0].Channel>3000){
		lineWidth = 8;
		pointShape = 'diamond';
		pointSize = 20;
	    }
	    series[g] = {lineWidth:lineWidth, color:color, pointShape:pointShape, pointSize:pointSize};
	    /*/
	    if(groups[g][0].Channel<3000) series[g] = {lineWidth:3, color:'green'};
	    if(groups[g][0].Channel>3000) series[g] = {lineWidth:3, color:'red'};
	    //*/
	}
    }
    else{
	for(var g=0;g<groups.length;g++){
	    var pick = g % colors.length;
	    series[g] = {color: colors[pick]};
	}
    }
    
    //This one is the last series with the roaming events in it.
    series[groups.length] = {color:'blue', pointShape: {type:'star', sides:5, dent:0.05}, pointSize:10};

    var title = row-1 + ' packets selected by the filters';
    var chart = new google.visualization.ComboChart(document.getElementById('RoamingPlot'));
    chart.draw(data,
	       {width: 1200, chartArea:{width:1100, left:100},  height: 340,
		title: title,
		hAxis: {direction: '1', title:'Time from start (sec)', viewWindow: {},  gridlines: {} },
		vAxis: {minValue:0, title:'RSSI (dBm)'},
		legend:{position:'top', maxLines:5},
		pointSize: 5,
		lineWidth: 0,
		seriesType: 'line',
		series: series
	       });

    return;
}
//...........................................................................................................
function doRoamingPlotFilters(allPackets,roamThisMAC)
{
    var filters = [];
    filters.length = 0;
    filters.push('QoS Data');
    filters.push('NULL QoS Data');
    filters.push('EAPOL');
    filters.push('Block ACK');
    filters.push('Probe response');
    filters.contains = function(x){
	var contains = false;
	for(var i=0;i<filters.length;i++){
	    if(filters[i]==x) contains = true;
	}
	return contains;
    }

    var categories = [];
    categories.length=0;
    categories.push('none');
    categories.contains = function(x){
	var contains = false;
	for(var i=0;i<categories.length;i++){
	    if(categories[i]==x) contains = true;
	}
	return contains;
    }

    var actions = [];
    actions.length=0;
    actions.push('none');
    actions.contains = function(x){
	var contains = false;
	for(var i=0;i<actions.length;i++){
	    if(actions[i]==x) contains = true;
	}
	return contains;
    }

    var ToMacs = [];
    ToMacs.length=0;
    ToMacs.contains = function(x){
	var contains = false;
	for(var i=0;i<ToMacs.length;i++){
	    if(ToMacs[i]==x) contains = true;
	}
	return contains;
    }
    ToMacs.push(roamThisMAC);

    var FromMacs = [];
    FromMacs.length=0;
    FromMacs.contains = function(x){
	var contains = false;
	for(var i=0;i<FromMacs.length;i++){
	    if(FromMacs[i]==x) contains = true;
	}
	return contains;
    }
    FromMacs.push('none');
    
    var rssiEvents = [];
    
    for(var a=0;a<allPackets.length;a++){
	var packetDetails = allPackets[a];
	    
	var goodFilter = false;
	if(filters.contains('none'))goodFilter=true;
	    else{
		if(filters.contains(packetDetails.packetType))goodFilter=true;
	    }
	    
	    var goodCategory=true;
	    if(packetDetails.packetType=='Action frames'){
		goodCategory=false;
		if(categories.contains('none'))goodCategory=true;
		else{
		    if(categories.contains(packetDetails.packetCategory))goodCategory=true;
		}
	    }

	    var goodAction=true;
	    if(packetDetails.packetCategory=='WNM' || packetDetails.packetCategory=='Fast Session Transfer'){
		var goodAction=false;
		if(actions.contains('none'))goodAction=true;
		else{
		    if(actions.contains(packetDetails.packetAction))goodAction=true;
		}
	    }	    
	    
	    var goodMACto = false;
	    if(ToMacs.contains('none'))goodMACto=true;
	    else{
		if(ToMacs.contains(packetDetails.receiverAddress))goodMACto=true;
	    }
	    var goodMACfrom = false;
	    if(FromMacs.contains('none'))goodMACfrom=true;
	    else{
		if(FromMacs.contains(packetDetails.transmitterAddress))goodMACfrom=true;
	    }
	    
	    var use = false;
	    use = goodFilter && goodCategory && goodAction;
	    use = use && (packetDetails.receiverAddress==roamThisMAC || packetDetails.transmitterAddress==roamThisMAC);
	    
	    if(use)rssiEvents.push(packetDetails);
	}

    return rssiEvents;
}
//...................................................................................................
function makeRoamingTable(allPackets)
{

    var roamThisMAC = theMacFilter;
    var tableEvents = doRoamingTableFilters(allPackets,roamThisMAC);
    
    if(tableEvents.length==0) return;

    //*/
    var all = [];
    for(var i=0;i<tableEvents.length;i++)all.push(tableEvents[i]);
    tableEvents = [];
    for(var i=0;i<all.length;i++) if(all[i].receiverAddress == roamThisMAC || all[i].transmitterAddress == roamThisMAC) tableEvents.push(all[i]);
    //*/
    
    
    var html = '';
    html += tableEvents.length + ' total entries' + '<br/>';
    html += '<table border="1" style="border-collapse:collapse;">';

    html += '<tr>';
    html += '<td>' + 'PacketNumber' + '</td>';
    html += '<td>' + 'Timestamp (sec)' + '</td>';
    html += '<td>' + 'Delta (sec)' + '</td>';
    html += '<td>' + 'Transmitter' + '</td>';
    html += '<td>' + 'Receiver' + '</td>';
    html += '<td>' + 'Freq (MHz)' + '</td>';
    html += '<td>' + 'Chan' + '</td>';
    html += '<td>' + 'RSSI' + '</td>';
    html += '<td>' + 'Type' + '</td>';
    html += '<td>' + 'Category' + '</td>';
    html += '<td>' + 'Action' + '</td>';
    /*/
    html += '<td>' + 'MCS' + '</td>';
    html += '<td>' + 'NSS' + '</td>';
    html += '<td>' + 'BW' + '</td>';
    html += '<td>' + 'GI' + '</td>';
    html += '<td>' + 'Rate' + '</td>';
    //*/
    html += '</tr>';

    for(var l=0;l<tableEvents.length;l++){
	html += '<tr>';

	var deltamicrosec = tableEvents[l].macTimestamp - holdJson.firstTimestamp;
	var deltamsec = deltamicrosec/1000;
	var deltasec = deltamicrosec/1E6;
	deltasec = tableEvents[l].arrivalTimeSeconds - holdJson.firstArrivalTime;
	
	var catText = '--';
	if(typeof tableEvents[l].packetCategory != 'undefined') catText = tableEvents[l].packetCategory;
	var actText = '--';
	if(typeof tableEvents[l].packetAction != 'undefined') actText = tableEvents[l].packetAction;

	html += '<td>' + tableEvents[l].packetNumber + '</td>';
	//html += '<td>' + tableEvents[l].macTimestamp + '</td>';
	html += '<td>' + tableEvents[l].arrivalTimeSeconds + '</td>';
	html += '<td>' + deltasec.toFixed(1) + '</td>';
	html += '<td>' + tableEvents[l].transmitterAddress + '</td>';
	html += '<td>' + tableEvents[l].receiverAddress + '</td>';
	html += '<td>' + tableEvents[l].Channel + '</td>';
	html += '<td>' + channelToNumber(tableEvents[l].Channel) + '</td>';	
	html += '<td>' + tableEvents[l].RSSI + '</td>';
	html += '<td>' + tableEvents[l].packetType + '</td>';
	html += '<td>' + catText + '</td>';
	html += '<td>' + actText + '</td>';
	/*/
	html += '<td>' + tableEvents[l].MCS + '</td>';
	html += '<td>' + tableEvents[l].NSS + '</td>';
	html += '<td>' + tableEvents[l].BW + '</td>';
	html += '<td>' + tableEvents[l].GI + '</td>';
	html += '<td>' + tableEvents[l].dataRate + '</td>';
	//*/
	
	html += '</tr>';
    }
    
    html += '</table>';
    document.getElementById('RoamingMessages').innerHTML = html;
    
    return;
}
//...........................................................................................................
function doRoamingTableFilters(allPackets,roamThisMAC)
{
    var filters = [];
    filters.length = 0;
	filters.push('Association request');
	filters.push('Association response');
	filters.push('Reassociation request');
	filters.push('Reassociation response');
	filters.push('Disassociate');
	filters.push('Authentication');
	filters.push('Deauthentication');
	filters.push('Action frames');
    filters.contains = function(x){
	var contains = false;
	for(var i=0;i<filters.length;i++){
	    if(filters[i]==x) contains = true;
	}
	return contains;
    }

    var categories = [];
    categories.length=0;
	categories.push('WNM');
	categories.push('Radio Measurement');
    categories.contains = function(x){
	var contains = false;
	for(var i=0;i<categories.length;i++){
	    if(categories[i]==x) contains = true;
	}
	return contains;
    }

    var actions = [];
    actions.length=0;
	actions.push('BSS Transition Management Query');
	actions.push('BSS Transition Management Request');
	actions.push('BSS Transition Management Response');
    actions.contains = function(x){
	var contains = false;
	for(var i=0;i<actions.length;i++){
	    if(actions[i]==x) contains = true;
	}
	return contains;
    }

    var ToMacs = [];
    ToMacs.length=0;
    ToMacs.contains = function(x){
	var contains = false;
	for(var i=0;i<ToMacs.length;i++){
	    if(ToMacs[i]==x) contains = true;
	}
	return contains;
    }
    ToMacs.push('none');

    var FromMacs = [];
    FromMacs.length=0;
    FromMacs.contains = function(x){
	var contains = false;
	for(var i=0;i<FromMacs.length;i++){
	    if(FromMacs[i]==x) contains = true;
	}
	return contains;
    }
    FromMacs.push('none');
    
    var rssiEvents = [];
    
    for(var a=0;a<allPackets.length;a++){
	var packetDetails = allPackets[a];
	    
	var goodFilter = false;
	if(filters.contains('none'))goodFilter=true;
	    else{
		if(filters.contains(packetDetails.packetType))goodFilter=true;
	    }
	    
	    var goodCategory=true;
	    if(packetDetails.packetType=='Action frames'){
		goodCategory=false;
		if(categories.contains('none'))goodCategory=true;
		else{
		    if(categories.contains(packetDetails.packetCategory))goodCategory=true;
		}
	    }

	    var goodAction=true;
	    if(packetDetails.packetCategory=='WNM' || packetDetails.packetCategory=='Fast Session Transfer'){
		var goodAction=false;
		if(actions.contains('none'))goodAction=true;
		else{
		    if(actions.contains(packetDetails.packetAction))goodAction=true;
		}
	    }	    
	    
	    var goodMACto = false;
	    if(ToMacs.contains('none'))goodMACto=true;
	    else{
		if(ToMacs.contains(packetDetails.receiverAddress))goodMACto=true;
	    }
	    var goodMACfrom = false;
	    if(FromMacs.contains('none'))goodMACfrom=true;
	    else{
		if(FromMacs.contains(packetDetails.transmitterAddress))goodMACfrom=true;
	    }
	    
	    var use = false;
	    use = goodFilter && goodCategory && goodAction;
	    use = use && (packetDetails.receiverAddress==roamThisMAC || packetDetails.transmitterAddress==roamThisMAC);
	    
	    if(use)rssiEvents.push(packetDetails);
	}

    return rssiEvents;
}
//...................................................................................................
function createHistogramFrom(data,bins,minVal,maxVal)
{

  var histogram = new Array;

  if(data.length<=0)return histogram;

  var binWidth = (maxVal-minVal)/bins;
  var binValue;

  for(var i=0;i<bins;i++)
    {
      var binLabel = minVal + i*binWidth + binWidth/2;
      histogram.push({binLabel:binLabel, binCount:0});
    }

  for(var i=0; i<data.length; i++)
    {
      binValue = Math.floor((data[i]-minVal)/binWidth);
      if(data[i]==maxVal)binValue=bins-1;
      if(data[i]==minVal)binValue=0;
      if(binValue>=0 && binValue<bins)histogram[binValue].binCount++;
    }

  return histogram;
}
//.......................................................
function statsOf(data)
{
  var Obj = new Object;

  var sum=0;
  var min, max;

  var goodData = new Array;
  for(var i=0;i<data.length;i++) if(!isNaN(data[i])) goodData.push(data[i]);

  min = goodData[0];
  max = goodData[0];
  for(var i=0;i<goodData.length;i++)
    {
      if(goodData[i]<min) min=goodData[i];
      if(goodData[i]>max) max=goodData[i];
    }
 
  var mean = 0;
  for(var i=0;i<goodData.length;i++) mean += goodData[i];
  sum = mean;
  mean /= goodData.length;

  var sigma = 0;
  for(var i=0;i<goodData.length;i++)sigma += (goodData[i]-mean)*(goodData[i]-mean);
  sigma = Math.sqrt(sigma/goodData.length);

  Obj = ({sum:sum, mean:mean, sigma:sigma, min:min, max:max});

  return Obj;
}
//.......................................................
function dBstatsOf(data)
{
  var Obj = new Object;

  var mean = 0;
  for(var i=0;i<data.length;i++)
    {
      var val = Math.pow(10,data[i]/10);
      mean += val;
    }
  mean /= data.length;
  mean = 10*log10(mean);

  var sigma = 0;
  for(var i=0;i<data.length;i++)sigma += (data[i]-mean)*(data[i]-mean);
  sigma = Math.sqrt(sigma/data.length);

  Obj = ({mean:mean, sigma:sigma});

  return Obj;
}
//.......................................................
function cdfValue(hist,target)
{
    //The array hist should be a histogram.  Target tells you what percent value you are looking for.
    //So a target of 50 (50%) means that the function will return the value for which 50% of the items
    //are below that value.  Etc.  

    if(target<0)target=0;
    if(target>100)target=100;

    var Sum = 0;
    for(var i=0;i<hist.length;i++)Sum += hist[i].binCount;

    //So, there are Sum total events.

    var Cum = 0;
    var CumArray = new Array;
    for(var i=0;i<hist.length;i++)
	{
	    Cum += hist[i].binCount;
	    CumArray.push(Cum/Sum * 100);
	}

    //CumArray is basically the CDF.  So, which is the point just below the point you want?
    var point=0;
    for(var i=0;i<CumArray.length;i++)if(CumArray[i]>target)break;
    point = i-1;

    if(point<0)point=0;
    if(point>CumArray.length-2)point=CumArray.length-2;

    var x1 = hist[point].binLabel;
    var y1 = CumArray[point];
    var x2 = hist[point+1].binLabel;
    var y2 = CumArray[point+1];

    var slope = (y2-y1)/(x2-x1);
    var yint = y1-slope*x1;

    var xValue = (target-yint)/slope;

    return xValue;

}
//.......................................................
function cdfValue2(array,target)
{
    //So I'm a little disappointed in how I did cdfVAlue, above.  Why bother having to pass in a histogram?
    //If you have the set of values (array) you can order them from lowest to highest.  Then to find, say
    //the 50% target, just walk along the array until you have passed 50% of the entries, and that's your 50%
    //point.

    if(target<0)target=0;
    if(target>100)target=100;

    var lowToHigh = sort(array,'ascending');

    var which = (target/100) * array.length;
    which = Math.ceil(which);
    if(which<0) which = 0;
    if(which>array.length-1)which=array.length-1;

    var item = lowToHigh[which];

    var value = array[item];

    return value;    
}
//.......................................................
function statsOf2(data)
{
  // In this one, data is a histogram with .binLabel and .binCount entries
  var Obj = new Object;

  var sum=0;

  var mean = 0;
  for(var i=0;i<data.length;i++)
    {
      sum += data[i].binCount;
      mean += data[i].binLabel*data[i].binCount;
    }
  mean /= sum;

  var sigma = 0;
  for(var i=0;i<data.length;i++)sigma += (data[i].binLabel*data[i].binCount-mean)*(data[i].binLabel*data[i].binCount-mean);
  sigma = Math.sqrt(sigma/data.length);

  Obj = ({sum:sum, mean:mean, sigma:sigma});

  return Obj;
}
//.................................................................
function checkMacFilter()
{
    var macFilter = null;

    var mac = document.getElementById('macFilter').value;
    mac = mac.toLowerCase();
    var pureMac = '';
    for(var i=0;i<mac.length;i++){
	if(mac[i]=='0' ||
	   mac[i]=='1' ||
	   mac[i]=='2' ||
	   mac[i]=='3' ||
	   mac[i]=='4' ||
	   mac[i]=='5' ||
	   mac[i]=='6' ||
	   mac[i]=='7' ||
	   mac[i]=='8' ||
	   mac[i]=='9' ||
	   mac[i]=='a' ||
	   mac[i]=='b' ||
	   mac[i]=='c' ||
	   mac[i]=='d' ||
	   mac[i]=='e' ||
	   mac[i]=='f') pureMac += mac[i];
    }

    if(pureMac.length!=12){
	alert('The MAC address you entered is not valid.  You need 12 characters between 0-9 or a-f.')
	document.getElementById('macFilter').value = '04:f0:21:28:c6:80';
	macFilter = '04.f0.21.28.c6.80.';
    }
    else{
	mac = pureMac[0]+pureMac[1]+':' +pureMac[2]+pureMac[3]+':' +pureMac[4]+pureMac[5]+':' +pureMac[6]+pureMac[7]+':' +pureMac[8]+pureMac[9]+':'
	    + pureMac[10]+pureMac[11];
	macFilter = pureMac[0]+pureMac[1]+'.' +pureMac[2]+pureMac[3]+'.' +pureMac[4]+pureMac[5]+'.' +pureMac[6]+pureMac[7]+'.' +pureMac[8]+pureMac[9]+'.'
	    + pureMac[10]+pureMac[11] +'.';
	document.getElementById('macFilter').value = mac;
    }
	   
    return macFilter;
}
//...........................................................................................................................
function orderReceive(packets)
{
    //Make the array that holds the results, along with methods for finding the occurance of a specific address, for example.
    var arr = [];
    arr.receiverContains = function(x){
	var contains = -1;
	for(var i=0;i<arr.length;i++){
	    if(arr[i].receiverAddress==x){
		contains = i;
		break;
	    }
	}
	return contains;
    }
    
    //Fill up the array.  Each entry is an object with the address, and the count for sending and receiving.
    for(var p=0;p<packets.length;p++){
	var ipt = arr.receiverContains(packets[p].receiverAddress);
	if(ipt>=0) arr[ipt].receiverCount++;
	else arr.push({receiverAddress: packets[p].receiverAddress, receiverCount: 1});
    }

    var retArray = [];
    //Re-order this array so that the counts are in descending order.
    while(arr.length>0){
	var max = -1;
	var ipt = -1;
	for(var j=0;j<arr.length;j++){
	    if(arr[j].receiverCount>max){
		max = arr[j].receiverCount;
		ipt = j;
	    }
	}
	retArray.push(arr[ipt]);
	arr.splice(ipt,1);
    }
    
    return retArray;
}
