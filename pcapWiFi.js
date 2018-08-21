'use strict';

var util = require('util');
var express = require('express');
var cors = require('cors');
var http = require('http');
var path = require('path');
var os = require('os');
var fs = require('fs');
const fileUpload = require('express-fileupload');
var multiparty = require('multiparty');
var request = require('request');
var Busboy = require('busboy');
var shell = require('shelljs');
const { spawn } = require('child_process');
var port = 3000;
//var port = 8282;

var runningNow = false;

var fileLoc = './upload/';
//var fileLoc = '../../Downloads/';

var pcapp = require('pcap-parser');
var ipv4Parser = require('node-ipv4');
//var pcap = require('pcap');

var app = express();
app.use(express.static('./'));
app.use(cors());
//app.use(fileUpload());
/*/
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
}));
//*/

app.get('/',homePage);
app.post('/parsePCAP/', parsePCAP);
app.get('/parsePCAP/', parsePCAP);

// start the server in the port!
app.listen(port, function () {
    console.log('REST endpoint now listening on port ' + port + '.');
});

app.post('/upload', function(req, res) {
  if (!req.files)
    return res.status(400).send('No files were uploaded.');
 
  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.sampleFile;
 
  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv(fileLoc + sampleFile.name, function(err) {
    if (err)
      return res.status(500).send(err);
 
    res.send('File uploaded!');
  });
});

// accept POST request on the homepage
app.post('/stream', function(req, res) {
    var busboy = new Busboy({ headers: req.headers });
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
	var saveTo = path.join('./upload', filename);
	console.log('Uploading: ' + saveTo);
	file.pipe(fs.createWriteStream(saveTo));
    });
    busboy.on('finish', function() {
	console.log('Upload complete');
	res.writeHead(200, { 'Connection': 'close' });
	res.end("File uploaded.  Use back arrow to get back, refresh the page, and this file should be in the list.");
    });
    return req.pipe(busboy);
    
});

app.post("/submit", function(httpRequest, httpResponse, next){

    var form = new multiparty.Form();

    form.on("part", function(part){
        if(part.filename)
        {
	    console.log("Part filename is " + part.filename);
            var FormData = require("form-data");
            var request = require("request")
            var form = new FormData();

            form.append("sampleFile", part, {filename: part.filename,contentType: part["content-type"]});

            var r = request.post("http://localhost:3000/upload", { "headers": {"transfer-encoding": "chunked"} }, function(err, res, body){
		if(err){
		    console.log('Some kind of uploading error: ' + err);
		}
		else{		    
                    httpResponse.send(res);
		}
            });
            
            r._form = form
        }
    })

    form.on("error", function(error){
        console.log("Hit the 'on error' section with error: " + error);
    })

    form.parse(httpRequest);
    
});

//.................................................
function homePage(req,res,next)
{

    console.log('... load home page ... ' );
    console.log('Request body is ' + JSON.stringify(req.null,2));

    var html = fs.readFileSync('./index.html');
    res.writeHead(200, {'Content-type': 'text/html'} );
    res.end(html);

    return;
}
//...............................................................
function parsePCAP(request,response,next)
{

    //Get the list of files that are in the upload directory.  Just for the heck'o it.
    const testFolder = fileLoc;

    var uploadFiles = [];
    fs.readdir(testFolder, (err, files) => {
	files.forEach(file => {
	    console.log(file);
	    uploadFiles.push(file);
	});
	nowTheRest(uploadFiles,request,response,next);
    })

    return;
}

function nowTheRest(uploadFiles,request,response,next){

    //console.log('In parsePCAP');
    var method = request.method.toLowerCase();
    //console.log('Method: ' + method);

    //*/
    //console.log('Request body is ' + util.inspect(request));
    //console.log('Request body is ' + request.body);
    
    var inFile;
    var filters;
    var categories;
    var actions;
    var ToMacs,FromMacs;

    if(method=='post')
    {
	//inFile = './octoscope-04_f0_21_2b_1c_85.pcap';
	//inFile = './g711a.pcap';
	inFile = './2018-04-06_17-27_orbi-70_merged.pcap';
    }

    else if(method=='get')
    {
	var url = request.url;
        //console.log('url ' + JSON.stringify(url));
        var split1 = url.split('?');
        var result = {fileName:null,filters:null,categories:null,actions:null,ToMacs:null,FromMacs:null,startAt:null};
        if(split1.length>1){
            var query = split1[1];
            var split2 = query.split('&');
            for(var i=0;i<split2.length;i++)
            {
                var split3 = split2[i].split('=');
                if(split3[0] == 'fileName')      result.fileName    = split3[1];
                if(split3[0] == 'filters')       result.filters     = split3[1];
                if(split3[0] == 'categories')    result.categories  = split3[1];
                if(split3[0] == 'actions')       result.actions     = split3[1];
                if(split3[0] == 'ToMacs')        result.ToMacs      = split3[1];
                if(split3[0] == 'FromMacs')      result.FromMacs    = split3[1];
		if(split3[0] == 'startAt')       result.startAt     = split3[1]*1;
		if(split3[0] == 'endAt')         result.endAt       = split3[1]*1;
            }
        }
	//console.log(JSON.stringify(result,null,2));
	inFile = result.fileName;
	inFile = decodeURI(inFile);

	if(inFile=='getTheFiles'){
	    response.json({uploadFiles: uploadFiles});
	    return;
	}
	
	if(runningNow){
	    //response.json({uploadFiles: uploadFiles});			   
	    return;
	}
	
	//inFile = './results/' + inFile.replace('.pcap','') + '/' + inFile;   //TEMP!!!!  For very specific file locations.
	inFile = fileLoc + inFile;
	
	filters = result.filters.split(',');
	for(var i=0;i<filters.length;i++)filters[i] = decodeURI(filters[i]);
	filters.contains = function(x){
	    var contains = false;
	    for(var i=0;i<filters.length;i++){
		if(filters[i]==x) contains = true;
	    }
	    return contains;
	}
	//console.log('Filters: ' + JSON.stringify(filters,null,2));

	categories = result.categories.split(',');
	for(var i=0;i<categories.length;i++)categories[i] = decodeURI(categories[i]);
	categories.contains = function(x){
	    var contains = false;
	    for(var i=0;i<categories.length;i++){
		if(categories[i]==x) contains = true;
	    }
	    return contains;
	}
	//console.log('Categories: ' + JSON.stringify(categories,null,2));

	actions = result.actions.split(',');
	for(var i=0;i<actions.length;i++)actions[i] = decodeURI(actions[i]);
	actions.contains = function(x){
	    var contains = false;
	    for(var i=0;i<actions.length;i++){
		if(actions[i]==x) contains = true;
	    }
	    return contains;
	}
	//console.log('Actions: ' + JSON.stringify(actions,null,2));

	ToMacs = result.ToMacs.split(',');
	for(var i=0;i<ToMacs.length;i++)ToMacs[i] = decodeURI(ToMacs[i]);
	ToMacs.contains = function(x){
	    var contains = false;
	    for(var i=0;i<ToMacs.length;i++){
		if(ToMacs[i]==x) contains = true;
	    }
	    return contains;
	}
	//console.log('toMACs: ' + JSON.stringify(ToMacs,null,2));

	FromMacs = result.FromMacs.split(',');
	for(var i=0;i<FromMacs.length;i++)FromMacs[i] = decodeURI(FromMacs[i]);
	FromMacs.contains = function(x){
	    var contains = false;
	    for(var i=0;i<FromMacs.length;i++){
		if(FromMacs[i]==x) contains = true;
	    }
	    return contains;
	}
	//console.log('fromMACs: ' + JSON.stringify(FromMacs,null,2));

	//console.log('Initially startAt is ' + result.startAt);
	if(result.startAt==null) result.startAt=0;
	//console.log('Then startAt is ' +  result.startAt);
	if(isNaN(result.startAt)) result.startAt=0;
	//console.log('Finally startAt is ' + result.startAt);

	if(result.endAt==null)  result.endAt=-1;
	if(isNaN(result.endAt)) result.endAt=-1;

	
    }

    /*/
    //Play with parsing using tshark.
    //var CLI = 'tshark  -Tjson -Y "frame.number==1" -r ' + inFile + ' > tshark.out';  //Redirect to a file to keep the log/console a bit cleaner.
    //var CLI = 'tshark  -Tjson -Y "frame.number==1" -r ' + inFile;
    //var CLI = 'tshark  -Tjson -r ' + inFile + ' > tshark.out';
    //var obj = shell.exec(CLI);
    //console.log('code = ' + obj.code);
    //console.log('stdout = ' + obj.stdout);
    //console.log('stderr = ' + obj.stderr);
    //var thePacketArray = JSON.parse(obj.stdout);
    //var thePacket = thePacketArray[0];
    //console.log(thePacket._source.layers.radiotap);

    //const child = spawn('ls', ['-lh', '/usr']);
    const child = spawn('tshark', ['-Tjson' , '-r' , inFile , '>' , 'tshark.out']);
    // use child.stdout.setEncoding('utf8'); if you want text chunks
    child.stdout.setEncoding('utf8');
    var chunks=0;
    child.stdout.on('data', (chunk) => {
	// data from standard output is here as buffers
	chunks++;
	console.log('CHUNK ' + chunks +'\n');
	console.log(chunk);
	console.log('\n\n');
    });
    // since these are streams, you can pipe them elsewhere
    const dest = fs.createWriteStream("./stderr.file")
    child.stderr.pipe(dest);
    child.on('close', (code) => {
	console.log(`child process exited with code ${code}`);
    });    
    //*/
    
    
    var parser = pcapp.parse(inFile);
    var packetNumber = 0;
    var maxPacketProcessed=0;
    var packetsProcessed=0;
    var returnText = ''
    var returnFields = [];
    var allMACs = [];
    var allPackets = [];
    //var roamThisMAC = '04.f0.21.28.c6.80.';
    var roamThisMAC = ToMacs[0];
    allMACs.contains = function(x){
	var contains = false;
	for(var i=0;i<allMACs.length;i++){
	    if(allMACs[i]==x) contains = true;
	}
	return contains;
    }
    var firstTimestamp = null;
    var firstArrivalTime = null;
    var firstMicrosecond = null;
    var errorObj = {errored:false, errorMessage:''};
    //console.log('Just startng the packet parser.');
    parser.on('packet', function(packet) {
	runningNow = true;
	if(packetNumber % 10000 == 0)
	    console.log('In the packet parser.  Doing ' + inFile + '. At packet # ' + packetNumber + ' allPackets now has length ' + allPackets.length);
	var packetText = '';
	var packetDetails = {};
	packetNumber++;
	var keepGoing = true;
	if(result.endAt>=0) keepGoing = packetNumber>=result.startAt && packetNumber<=Math.min(result.startAt+100000,result.endAt);
	else                keepGoing = packetNumber>=result.startAt && packetNumber<=result.startAt+100000;
	if(keepGoing){
	    maxPacketProcessed=packetNumber;
	    packetsProcessed++;
	    packetText += '\n...................................................\n';
	    packetText += 'File Name: ' + inFile + '\n';
	    packetText += 'PACKET NUMBER:  ' + packetNumber + '\n';
	    packetText += 'Packet Header: ' + JSON.stringify(packet.header,null,0) + '\n';
	    packetText += 'Total packet length = ' + packet.data.length + ' bytes, ' + packet.data.length*8 + ' bits.\n';
	    packetDetails.arrivalTimeSeconds = packet.header.timestampSeconds  + packet.header.timestampMicroseconds/1e6;
	    packetDetails.microSeconds = packet.header.timestampMicroseconds;
	    if(firstArrivalTime==null)firstArrivalTime=packet.header.timestampSeconds + packet.header.timestampMicroseconds/1e6;
	    if(firstMicrosecond==null)firstMicrosecond=packet.header.timestampMicroseconds;
	    var arrival = (packet.header.timestampSeconds + packet.header.timestampMicroseconds/1e6)*1000;
	    var d = new Date(arrival);
	    packetText += 'Packet arrival time is ' + d + '\n';

	    // do your packet processing
	    //packetText += JSON.stringify(packet.data,null,2);
	    var string = '';
	    for(var i=0;i<packet.data.length-1;i++){
		var temp = packet.data.slice(i,i+1).toString("hex");
		//packetText += temp + ' ';
		string += temp + ' ';
	    }
	    //packetText += string;
	    
	    var ipnt = 0;
	    
	    var radiotapVersion = packet.data.slice(ipnt,ipnt+1).toString("hex");
	    packetText += 'Radiotap Version = ' + radiotapVersion + '\n';
	    ipnt++;
	    
	    var radiotapPad = packet.data.slice(ipnt,ipnt+1).toString("hex");
	    packetText += 'Radiotap Pad = ' + radiotapPad + '\n';
	    ipnt++;
	    
	    var byteArray = []; for(var i=ipnt;i<ipnt+2;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
	    packetText += 'Header Length = ' + byteArray.toString() + '\n';
	    var headerLength = parseInt(byteArray[0],16) + parseInt(byteArray[1],16)*Math.pow(16,2);
	    packetText += 'Header Length = ' + headerLength + '\n';
	    ipnt +=2;
	    
	    var byteArray = []; for(var i=ipnt;i<ipnt+4;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
	    packetText += 'Present = ' + byteArray.toString() + '\n';
	    var presentWord = ''; for(var i=0;i<byteArray.length;i++) presentWord = byteArray[i] + presentWord;
	    var presentObj = parsePresent(byteArray);
	    packetText += 'Present word= ' + presentWord + '\n';
	    //packetText += JSON.stringify(presentObj,null,2);
	    ipnt +=4;

	    if(presentObj.TSFT){
		var byteArray = []; for(var i=ipnt;i<ipnt+8;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		packetText += 'MAC timestamp = ' + byteArray.toString() + '\n';
		var macTimestamp = 0;
		for(var i=0;i<byteArray.length;i++) macTimestamp += parseInt(byteArray[i],16) * Math.pow(16,2*i) ;
		packetText += 'MAC timestamp = ' + macTimestamp + '\n';
		if(firstTimestamp==null)firstTimestamp = macTimestamp;
		ipnt+=8;
	    }
	    
	    var radiotapFlags = packet.data.slice(ipnt,ipnt+1).toString("hex");
	    packetText += 'Radiotap Flags = ' + radiotapFlags + '\n';
	    var GI = 800;
	    var flagsObj = parseFlags(radiotapFlags);
	    if(flagsObj.ShortGI) GI = 400;
	    packetText += JSON.stringify(flagsObj,null,2) + '\n';
	    ipnt++;
	    
	    var dataRate = packet.data.slice(ipnt,ipnt+1).toString("hex");
	    packetText += 'Data Rate (hex) = ' + dataRate + '\n';
	    dataRate = parseInt(dataRate,16);  //Measured in 500 kbps steps
	    dataRate *= 500; //kbps
	    dataRate /=1000; //Mbps
	    packetText += 'Data Rate = ' + dataRate + ' Mbps\n';
	    ipnt++;
	    
	    var byteArray = []; for(var i=ipnt;i<ipnt+2;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
	    packetText += 'Channel frequency (hex) = ' + byteArray.toString() + '\n';
	    var channelFrequency = 0;
	    for(var i=0;i<byteArray.length;i++) channelFrequency += parseInt(byteArray[i],16) * Math.pow(16,2*i) ;
	    packetText += 'Channel Frequency = ' + channelFrequency + ' MHz\n';
	    
	    ipnt+=2;
	    
	    var byteArray = []; for(var i=ipnt;i<ipnt+2;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
	    packetText += 'Channel flags = ' + byteArray.toString() + '\n';
	    var channelObj = parseChannel(byteArray);
	    packetText += JSON.stringify(channelObj,null,2) + '\n';
	    ipnt+=2;

	    if(presentObj.dBmAntennaSignal){
		var RSSI = packet.data.slice(ipnt,ipnt+1).toString("hex");
		packetText += 'RSSI = ' + RSSI + '\n';
		var RSSIbits = byte2bits(parseInt(RSSI,16));
		var RSSIval = 0;
		if(RSSIbits[0]==1){//This is negative, so take the twos-complement
		    //packetText += 'RSSI = ' + RSSIbits;
		    var flipped = ~parseInt(RSSI,16);
		    //packetText += 'RSSI = ' + byte2bits(flipped);
		    var twos = flipped+1;
		    //packetText += 'RSSI = ' + byte2bits(twos);
		    RSSIval = parseInt(byte2bits(twos),2) * -1;
		    packetText += 'RSSI = ' + RSSIval + ' dBm\n';
		}
		ipnt++;
	    }
	    
	    if(presentObj.dBmAntennaNoise){
		var Noise = packet.data.slice(ipnt,ipnt+1).toString("hex");
		packetText += 'Noise = ' + Noise + '\n';
		var Noisebits = byte2bits(parseInt(Noise,16));
		var Noiseval = 0;
		if(Noisebits[0]==1){//This is negative, so take the twos-complement
		    //packetText += 'Noise = ' + Noisebits;
		    var flipped = ~parseInt(Noise,16);
		    //packetText += 'Noise = ' + byte2bits(flipped);
		    var twos = flipped+1;
		    //packetText += 'Noise = ' + byte2bits(twos);
		    Noiseval = parseInt(byte2bits(twos),2) * -1;
		    packetText += 'Noise = ' + Noiseval + ' dBm\n';
		}
		ipnt++;
	    }
	    
	    if(presentObj.lockQuality){
		var byteArray = []; for(var i=ipnt;i<ipnt+2;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		packetText += 'Lock Quality = ' + byteArray.toString() + '\n';
		var Quality = 0;
		for(var i=0;i<byteArray.length;i++) Quality += parseInt(byteArray[i],16) * Math.pow(16,2*i) ;
		packetText += 'Quality = ' + Quality + '\n';
		ipnt+=2;
	    }

	    if(presentObj.antenna){
		var byteArray = []; for(var i=ipnt;i<ipnt+1;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		packetText += 'Antenna = ' + byteArray.toString() + '\n';
		ipnt+=1;
	    }
	    
	    if(presentObj.dBantennaSignal){
		var SNR = packet.data.slice(ipnt,ipnt+1).toString("hex");
		packetText += 'SNR = ' + SNR + '\n';
		var SNRbits = byte2bits(parseInt(SNR,16));
		var SNRval = 0;
		if(SNRbits[0]==1){//This is negative, so take the twos-complement
		    //packetText += 'Noise = ' + Noisebits;
		    var flipped = ~parseInt(SNR,16);
		    //packetText += 'Noise = ' + byte2bits(flipped);
		    var twos = flipped+1;
		    //packetText += 'Noise = ' + byte2bits(twos);
		    SNRval = parseInt(byte2bits(twos),2) * -1;
		    packetText += 'SNR = ' + SNRval + ' dBm\n';
		}
		else{
		    SNRval = parseInt(SNR,16);
		    packetText += 'SNR = ' + SNRval + ' dBm\n';
		}
		ipnt++;
	    }

	    if(presentObj.rxFlags){
		var skip = packet.data.slice(23,24).toString("hex");
		ipnt++;	    
		var byteArray = []; for(var i=ipnt;i<ipnt+2;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		packetText += 'Rx flags = ' + byteArray.toString() + '\n';
		ipnt+=2;
	    }

	    var mcsObj = {mcs:-1, nss:-1};
	    var bandwidthObj = {bandwidthMHz:20};
	    if(presentObj.VHT){
		var byteArray = []; for(var i=ipnt;i<ipnt+12;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		packetText += 'VHT = ' + byteArray.toString() + '\n';
		var vhtObj = parseVHT(byteArray);
		packetText += JSON.stringify(vhtObj,null,2) + '\n';
		var guardObj = parseGuard(byteArray);
		GI=800;
		if(guardObj.shortGuardInterval)GI=400;
		packetText += JSON.stringify(guardObj,null,2) + '\n';
		var bandwidth = byteArray[3].toString("hex");
		bandwidthObj = parseBandwidth(bandwidth);
		packetText += 'Bandwidth = ' + bandwidth + '\n';
		mcsObj = parseMCS(byteArray);
		packetText += JSON.stringify(mcsObj,null,2) + '\n';
		var coding = byteArray[8].toString("hex");
		packetText += 'Coding = ' + coding + '\n';
		dataRate = VHTrates(bandwidthObj.bandwidthMHz,mcsObj.mcs,mcsObj.nss,GI);
		packetText += 'Data rate is ' + dataRate + ' Mbps\n';
		ipnt+=12;
	    }

	    if(presentObj.vendorNSnext){
		var byteArray = []; for(var i=ipnt;i<ipnt+3;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		packetText += 'vendor oui = ' + byteArray.toString() + '\n';
		ipnt+=3;
		var byteArray = []; for(var i=ipnt;i<ipnt+1;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		packetText += 'vendor sub namespace = ' + byteArray.toString() + '\n';
		ipnt+=1;
		var byteArray = []; for(var i=ipnt;i<ipnt+2;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		packetText += 'vendor data length = ' + byteArray.toString() + '\n';
		ipnt+=2;
		var vendorDataLength = 0;
		for(var i=0;i<byteArray.length;i++) vendorDataLength += parseInt(byteArray[i],16) * Math.pow(16,2*i) ;
		packetText += 'vendor data length = ' + vendorDataLength + '\n';
		var byteArray = []; for(var i=ipnt;i<ipnt+vendorDataLength;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		packetText += 'vendor data = ' + byteArray.toString() + '\n';
		ipnt+=vendorDataLength;
		
		var byteArray = []; for(var i=ipnt;i<ipnt+4;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		packetText += 'Skipping 4 bytes = ' + byteArray.toString() + '\n';
		ipnt+=4;
		if(!presentObj.VHT){
		    var byteArray = []; for(var i=ipnt;i<ipnt+4;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		    packetText += 'Skipping 4 more bytes = ' + byteArray.toString() + '\n';
		    ipnt+=4;
		}
	    }
	    
	    packetDetails.type = '';
	    var typeSubtype = packet.data.slice(ipnt,ipnt+1).toString("hex");
	    packetText += 'typeSubtype = ' + typeSubtype + '\n';
	    var fcObj = decodeSubtype(typeSubtype);
	    packetText += 'Version:  = ' + fcObj.version + '\n';
	    packetText += 'Type:  = ' + fcObj.type + '\n';
	    packetText += 'Subtype:  = ' + fcObj.subtype + '\n';
	    packetText += 'Name:  = ' + fcObj.name + '\n';
	    packetDetails.type = fcObj.name;
	    ipnt++;
	    
	    var fcFlags = packet.data.slice(ipnt,ipnt+1).toString("hex");
	    packetText += 'Frame Control Flags = ' + fcFlags + '\n';
	    var fcFlagObj = decodeFlags(fcFlags);
	    packetText += JSON.stringify(fcFlagObj,null,2) + '\n';
	    ipnt++;
	    
	    var byteArray = []; for(var i=ipnt;i<ipnt+2;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
	    packetText += 'Duration string = ' + byteArray.toString() + '\n';
	    var duration = parseDuration(byteArray);
	    packetText += 'Duration in microseconds = ' + duration + '\n';
	    ipnt+=2;
	    
	    var byteArray = []; for(var i=ipnt;i<ipnt+6;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
	    packetDetails.receiverAddress = ''; for(var i=0;i<byteArray.length;i++) packetDetails.receiverAddress += byteArray[i] + '.';
	    if(!allMACs.contains(packetDetails.receiverAddress))allMACs.push(packetDetails.receiverAddress);
	    ipnt+=6;
	    
	    var byteArray = []; for(var i=ipnt;i<ipnt+6;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
	    packetDetails.transmitterAddress = ''; for(var i=0;i<byteArray.length;i++) packetDetails.transmitterAddress += byteArray[i] + '.';
	    if(!allMACs.contains(packetDetails.transmitterAddress))allMACs.push(packetDetails.transmitterAddress);
	    ipnt+=6;

	    if(fcObj.type==1){  //These are Control Frames.  I think that in general they do not have other addresses.\
	    	packetDetails.BSSID = 'none';
		packetDetails.destinationAddress = 'none';
		packetDetails.sourceAddress = 'none';
	    }

	    else{
		
		var byteArray = []; for(var i=ipnt;i<ipnt+6;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		if(!fcFlagObj.fromDS && !fcFlagObj.toDS){
		    packetDetails.BSSID = ''; for(var i=0;i<byteArray.length;i++) packetDetails.BSSID += byteArray[i] + '.';
		    packetDetails.destinationAddress = packetDetails.receiverAddress;
		    packetDetails.sourceAddress = packetDetails.transmitterAddress;
		}
		else if(fcFlagObj.toDS){
		    packetDetails.destinationAddress = ''; for(var i=0;i<byteArray.length;i++) packetDetails.destinationAddress += byteArray[i] + '.';
		    if(!fcFlagObj.fromDS){
			packetDetails.sourceAddress = packetDetails.transmitterAddress;
			packetDetails.BSSID = packetDetails.receiverAddress;
		    }
		}
		else if(!fcFlagObj.toDS && fcFlagObj.fromDS){
		    packetDetails.sourceAddress = ''; for(var i=0;i<byteArray.length;i++) packetDetails.sourceAddress += byteArray[i] + '.';
		    packetDetails.BSSID = packetDetails.transmitterAddress;
		    packetDetails.destinationAddress = packetDetails.receiverAddress;
		}
		ipnt+=6;

		if(fcFlagObj.fromDS && fcFlagObj.toDS){
		    var byteArray = []; for(var i=ipnt;i<ipnt+6;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		    packetDetails.sourceAddress = ''; for(var i=0;i<byteArray.length;i++) packetDetails.sourceAddress += byteArray[i] + '.';
		    packetDetails.BSSID = packetDetails.transmitterAddress;
		    ipnt+=6;
		}

		packetText += 'Receiver Address = '       + packetDetails.receiverAddress + '\n';
		packetText += 'Destination Address = '    + packetDetails.destinationAddress + '\n';
		packetText += 'Transmitter Address = '    + packetDetails.transmitterAddress + '\n';
		packetText += 'Source Address = '         + packetDetails.sourceAddress + '\n';
		packetText += 'BSS Id = '                 + packetDetails.BSSID + '\n';

		//There seems to be a reliable way of finding a "malformed packet"
		if(packetDetails.receiverAddress.indexOf('....')>=0 && packetDetails.transmitterAddress.indexOf('....')>=0) packetDetails.type = 'Malformed packet';

		//Many of the packets on the network, like ARP, LLC, Ping, etc. all come from, or to, the DS.  If you really are interested only in Wi-Fi, you might be
		//able to avoid those.  So make them a separate type of packet.  The ToDS and FromDS types.

		if(typeof packetDetails.type == 'undefined')packetDetails.type = '';

		if(packetDetails.type.indexOf('QoS')<0 &&
		   packetDetails.type.indexOf('Data')<0
		  ){
		    if(fcFlagObj.fromDS) packetDetails.type = 'FromDS';
		    if(fcFlagObj.toDS)   packetDetails.type = 'ToDS';
		}


		var byteArray = []; for(var i=ipnt;i<ipnt+2;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		packetText += 'FragSeq = ' + byteArray.toString() + '\n';
		var fragObj = parseFrag(byteArray);
		packetText += 'Fragment number = ' + fragObj.fragment + '\n';
		packetText += 'Sequence number = ' + fragObj.sequence + '\n';
		ipnt+=2;

		if(packetDetails.type=='QoS Data' ||
		   packetDetails.type=='QoS Data + Contention Free ACK' ||
		   packetDetails.type=='QoS Data + Contention Free Poll' ||
		   packetDetails.type=='QoS Data + Contention Free ACK + Contention Free Poll' ||
		   packetDetails.type=='NULL QoS Data' ||
		   packetDetails.type=='NULL QoS Data + Contention Free Poll' ||
		   packetDetails.type=='NULL QoS Data + Contention Free ACK + Contention Free Poll'
		  ){
		    var byteArray = []; for(var i=ipnt;i<ipnt+2;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		    packetText += 'QoS Control = ' + byteArray.toString() + '\n';
		    var qosObj = parseQoS(byteArray);
		    packetText += 'Qos Control Object:\n' + JSON.stringify(qosObj,null,2) + '\n';
		    ipnt+=2;
		    
		    var byteArray = []; for(var i=ipnt;i<ipnt+8;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		    packetText += 'LLC = ' + byteArray.toString() + '\n';
		    var llcObj = decodeLLC(byteArray);
		    packetText += 'LLC decode\n' + JSON.stringify(llcObj,null,2) + '\n';
		    //if(byteArray[6]=='88' && byteArray[7]=='8e'){
		    if(llcObj.Type[0]=='88' && llcObj.Type[1]=='8e'){
			packetText += 'LLC indicates that this is an EAPOL packet.\n';
			packetDetails.type = 'EAPOL';
			ipnt+=8;
		    }
		    if(llcObj.Type[0]=='08' && llcObj.Type[1]=='00'){
			packetText += 'LLC indicates that this is an IPv4 packet.\n';
			ipnt+=8;
			var byteArray = []; for(var i=ipnt;i<ipnt+24;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
			var ipv4Obj = parseIpv4(byteArray);
			packetText += 'IPv4 object:\n' + JSON.stringify(ipv4Obj,null,2) + '\n';
			packetDetails.type = ipv4Obj.protocolName;
			ipnt+=24;
		    }
		    if(llcObj.Type[0]=='08' && llcObj.Type[1]=='06'){
			packetText += 'LLC indicates that this is an ARP packet.\n';
			packetDetails.type = 'ARP';
			ipnt+=8;
		    }
		    else{
			ipnt+=8;
		    }
		}

		else if(packetDetails.type=='Data'){
		    var byteArray = []; for(var i=ipnt;i<ipnt+8;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		    packetText += 'CCMP Initialization Vector = ' + byteArray.toString() + '\n';
		    ipnt+=8;
		    var byteArray = []; for(var i=ipnt;i<ipnt+2;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
		    packetText += 'Data = ' + byteArray.toString() + '\n';
		    ipnt+=2;
		}
		
		else if(packetDetails.type=='Probe request' || packetDetails.type=='Probe response'){
		    //Get the tagged parameters.  Haven't written this code yet.
		}
		else if(packetDetails.type=='Beacon'){
		    if(!fcFlagObj.protectedData){
			var Beacon = {fixed:{}, tagged:{}};
			var byteArray = []; for(var i=ipnt;i<ipnt+12;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
			Beacon.fixed.bytes = byteArray;
			ipnt+=12;
			//The remaining packets are the tagged packets.
			var remain = packet.data.length - ipnt;
			if(flagsObj.FCS) remain -= 4;  //If there is an FCS, the last 4 bytes are that.
			packetText += 'There are ' + remain + ' bytes of tagged packets in this beacon. \n';
			var byteArray = []; for(var i=ipnt;i<ipnt+remain;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
			Beacon.tagged.bytes = byteArray;
			ipnt+=remain;
			Beacon.tagged = decodeBeaconTagged(Beacon);
			packetText += 'Found beacon ' + JSON.stringify(Beacon.tagged.tags,null,2);
			var csa = Beacon.tagged.tags.locate("Channel Switch Announcement");
			if(csa>=0){
			    var toChannel = parseInt(Beacon.tagged.tags[csa].bytes[1],16);
			    var dsp = Beacon.tagged.tags.locate("DS Parameter Set");
			    var fromChannel = null;
			    if(dsp>=0) fromChannel = parseInt(Beacon.tagged.tags[dsp].bytes[0],16);
			    packetText += 'Channel Switch Announcement going to channel ' + toChannel + ' from ' + fromChannel + '. \n';
			}
		    }
		    else if(fcFlagObj.protectedData){
			//This stuff is WEP stuff.
			var Beacon={};
			packetText += 'This packet is WEP protected.  See the protectedData flag above. \n';
			var byteArray = []; for(var i=ipnt;i<ipnt+3;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
			Beacon.wepParameters = byteArray;
			packetText += 'WEP parameters are ' + Beacon.wepParameters + '\n';
			ipnt+=3;
			var byteArray = []; for(var i=ipnt;i<ipnt+1;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
			Beacon.keyIndex = byteArray;
			packetText += 'Key Index is ' + Beacon.keyIndex + '\n';
			ipnt+=1;
			//The remaining packets are the data.
			var remain = packet.data.length - ipnt;
			remain -= 4;  //The last 4 bytes are the ICV
			var byteArray = []; for(var i=ipnt;i<ipnt+remain;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
			Beacon.data = byteArray;
			ipnt+=remain;
			var byteArray = []; for(var i=ipnt;i<ipnt+4;i++)byteArray.push(packet.data.slice(i,i+1).toString("hex"));
			Beacon.ICV = byteArray;		    		    
			packetText += 'ICV is ' + Beacon.ICV + '\n';
			packetText += 'There are ' + remain + ' bytes of protected data:  ' + Beacon.data + '\n';
		    }
		}

		else if(packetDetails.type=='Action frames'){

		    var categoryCode = packet.data.slice(ipnt,ipnt+1).toString("hex");
		    packetText += 'categoryCode = ' + categoryCode + '\n';
		    var category = decodeCategory(categoryCode);
		    packetText += 'Category = ' + category + '\n';
		    packetDetails.category = category;
		    ipnt++;
		    
		    //Ouch.  There are different action codes for each of these categories.  Might just have to pick the interesting ones for now.
		    
		    var actionCode = packet.data.slice(ipnt,ipnt+1).toString("hex");
		    packetText += 'actionCode = ' + actionCode + '\n';
		    var action = decodeActionCode(categoryCode,actionCode);
		    packetText += 'Action= ' + action + '\n';
		    packetDetails.action = action;
		    ipnt++;
		}
		
	    } //This is for management and data frames


	    var returnPacket = {
		packetNumber:packetNumber,
		packetBytes: packet.data.length,
		packetMicroseconds: duration,
		arrivalTimeSeconds:packetDetails.arrivalTimeSeconds,
		microSeconds:packetDetails.microSeconds,
		macTimestamp:macTimestamp,
		packetType:packetDetails.type,
		packetCategory:packetDetails.category,
		packetAction:packetDetails.action,
		RSSI: RSSIval,
		Channel: channelFrequency,
		dataRate: dataRate,
		MCS: mcsObj.mcs,
		NSS: mcsObj.nss,
		BW: bandwidthObj.bandwidthMHz,
		GI: GI,
		transmitterAddress:packetDetails.transmitterAddress,
		sourceAddress:packetDetails.sourceAddress,
		receiverAddress:packetDetails.receiverAddress,
		destinationAddress:packetDetails.destinationAddress,
		bssID:packetDetails.BSSID,
		csa: {tagID:csa, from: fromChannel, to: toChannel}
	    };

	    var goodFilter = false;
	    if(filters.contains('none'))goodFilter=true;
	    else{
		if(filters.contains(packetDetails.type))goodFilter=true;
	    }
	    
	    var goodCategory=true;
	    if(packetDetails.type=='Action frames'){
		goodCategory=false;
		if(categories.contains('none'))goodCategory=true;
		else{
		    if(categories.contains(packetDetails.category))goodCategory=true;
		}
	    }

	    var goodAction=true;
	    if(packetDetails.category=='WNM' || packetDetails.category=='Fast Session Transfer'){
		var goodAction=false;
		if(actions.contains('none'))goodAction=true;
		else{
		    if(actions.contains(packetDetails.action))goodAction=true;
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

	    var macTest;
	    if(ToMacs.contains('none') && FromMacs.contains('none')) macTest=true;
	    else if(ToMacs.contains('none') && !FromMacs.contains('none')){
		if(FromMacs.contains(packetDetails.transmitterAddress))macTest=true;
	    }
	    else if(!ToMacs.contains('none') && FromMacs.contains('none')){
		if(ToMacs.contains(packetDetails.receiverAddress))macTest=true;
	    }
	    else if(!ToMacs.contains('none') && !FromMacs.contains('none')){
		if(ToMacs.contains(packetDetails.receiverAddress) || FromMacs.contains(packetDetails.transmitterAddress))macTest=true;
	    }

	    var use = false;
	    //use = goodFilter && goodCategory && goodAction && (goodMACto || goodMACfrom);
	    //use =  (goodFilter || goodCategory || goodAction)&& goodMAC;
	    use = goodFilter && goodCategory && goodAction && macTest;


	    if(use){
		//console.log(packetText);
		/*/
		  console.log(packetNumber + ' , ' + macTimestamp + ' , ' + packetDetails.type + ' , ' +
		  packetDetails.transmitterAddress + ' , ' + packetDetails.receiverAddress);
		//*/
		returnText += packetNumber + ' , ' + macTimestamp + ' , ' + packetDetails.type + ' , ' +
		    packetDetails.transmitterAddress + ' , ' + packetDetails.receiverAddress;
		
		returnFields.push(returnPacket);
	    }
	    if(packetNumber== -4177) console.log(packetText);     //Write out packet here.
	    allPackets.push(returnPacket);
	}
    });
    
    parser.on('error', function(err){
	console.log('Harsh!  You have received this error:  ' + err);
	errorObj = {errored:true, errorMessage: 'Got an error trying to deal with this file.  The error was: ' + err};
	runningNow = false;
    });
    
    parser.on('end', function(packet) {
	runningNow = false;
	console.log('Reached the end');
	console.log('Number of packets is ' + allPackets.length);
	console.log('Number of filtered packets is ' + returnFields.length);
	console.log('Last packet number = ' + packetNumber);
	console.log('Max packet processed = ' + maxPacketProcessed);
	console.log('Number of packets processed = ' + packetsProcessed);

	//Who was sending probe requests?  This is going to help figure out who the clients are here.
	var probers = whoSent("Probe request",allPackets);
	if(probers.length==0){
	    probers.push({sourceAddress:null});
	}
	    
	//*/
	if(probers.length==0) console.log('There are no probe requests.');
	else console.log('The most prolific requester is ' + probers[0].sourceAddress);
	//*/

	var responders = [];
	if(probers[0].sourceAddress != null){
	    //Who was sending packets to this receiver?  This is going to help figure out who the APs are.
	    responders = whoSentTo(probers[0].sourceAddress,allPackets);
	    if(responders.length>0)
		console.log('The most prolific responder is ' + responders[0].sourceAddress);
	    else
		console.log('There are no packets destined for address ' + probers[0].sourceAddress);
	}

	var mobilityEvents = [];
	//Let's find mobility related events for that guy
	var target = probers[0].sourceAddress;
	filters.length = 0;
	filters.push('Association request');
	filters.push('Association response');
	filters.push('Reassociation request');
	filters.push('Reassociation response');
	filters.push('Disassociate');
	filters.push('Authentication');
	categories.length=0;
	categories.push('WNM');
	actions.length=0;
	actions.push('BSS Transition Management Request');
	ToMacs.length=0;
	FromMacs.length=0;
	FromMacs.push(target);

	for(var a=0;a<allPackets.length;a++){
	    var packetDetails = allPackets[a];
	    
	    var goodFilter = false;
	    if(filters.contains('none'))goodFilter=false;
	    else{
		if(filters.contains(packetDetails.packetType))goodFilter=true;
	    }
	    
	    var goodCategory=false;
	    if(categories.contains('none'))goodCategory=false;
	    else{
		if(categories.contains(packetDetails.packetCategory))goodCategory=true;
	    }
	    
	    var goodAction=false;
	    if(actions.contains('none'))goodAction=false;
	    else{
		if(actions.contains(packetDetails.packetAction))goodAction=true;
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
	    use =  (goodFilter || goodCategory || goodAction) && (goodMACto||goodMACfrom);
	    
	    if(use)mobilityEvents.push(packetDetails);
	}
	//console.log('The mobility events for this user are:\n' + JSON.stringify(mobilityEvents,null,2));
	console.log('This many mobility events ' + mobilityEvents.length);


	var qosDataEvents = [];
	//Let's find all of the QoS data events for that guy
	var target = probers[0].sourceAddress;
	filters.length = 0;
	filters.push('QoS Data');
	categories.length=0;
	categories.push('none');
	actions.length=0;
	actions.push('none');
	ToMacs.length=0;
	FromMacs.length=0;
	FromMacs.push(target);

	for(var a=0;a<allPackets.length;a++){
	    var packetDetails = allPackets[a];
	    
	    var goodFilter = false;
	    if(filters.contains('none'))goodFilter=false;
	    else{
		if(filters.contains(packetDetails.packetType))goodFilter=true;
	    }
	    
	    var goodCategory=false;
	    if(categories.contains('none'))goodCategory=false;
	    else{
		if(categories.contains(packetDetails.packetCategory))goodCategory=true;
	    }
	    
	    var goodAction=false;
	    if(actions.contains('none'))goodAction=false;
	    else{
		if(actions.contains(packetDetails.packetAction))goodAction=true;
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
	    use =  (goodFilter || goodCategory || goodAction) && (goodMACto || goodMACfrom);
	    
	    if(use)qosDataEvents.push(packetDetails);
	}
	//console.log('The QoS data events for this user are:\n' + JSON.stringify(qosDataEvents,null,2));
	console.log('This many QoS data events ' + qosDataEvents.length);


	var probeResponseEvents = [];
	//Let's find all of the Probe Response events for that guy
	var target = probers[0].sourceAddress;
	filters.length = 0;
	filters.push('Probe response');
	categories.length=0;
	categories.push('none');
	actions.length=0;
	actions.push('none');
	ToMacs.length=0;
	FromMacs.length=0;
	FromMacs.push(target);

	for(var a=0;a<allPackets.length;a++){
	    var packetDetails = allPackets[a];
	    
	    var goodFilter = false;
	    if(filters.contains('none'))goodFilter=false;
	    else{
		if(filters.contains(packetDetails.packetType))goodFilter=true;
	    }
	    
	    var goodCategory=false;
	    if(categories.contains('none'))goodCategory=false;
	    else{
		if(categories.contains(packetDetails.packetCategory))goodCategory=true;
	    }
	    
	    var goodAction=false;
	    if(actions.contains('none'))goodAction=false;
	    else{
		if(actions.contains(packetDetails.packetAction))goodAction=true;
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
	    use =  (goodFilter || goodCategory || goodAction) && (goodMACto || goodMACfrom);
	    
	    if(use)probeResponseEvents.push(packetDetails);
	}
	//console.log('The Probe response events for this user are:\n' + JSON.stringify(probeResponseEvents,null,2));
	console.log('This many probe response events ' + probeResponseEvents.length);

	var blockACKEvents = [];
	//Let's find all of the Probe Response events for that guy
	var target = probers[0].sourceAddress;
	filters.length = 0;
	filters.push('Block ACK');
	categories.length=0;
	categories.push('none');
	actions.length=0;
	actions.push('none');
	ToMacs.length=0;
	FromMacs.length=0;
	FromMacs.push(target);

	for(var a=0;a<allPackets.length;a++){
	    var packetDetails = allPackets[a];
	    
	    var goodFilter = false;
	    if(filters.contains('none'))goodFilter=false;
	    else{
		if(filters.contains(packetDetails.packetType))goodFilter=true;
	    }
	    
	    var goodCategory=false;
	    if(categories.contains('none'))goodCategory=false;
	    else{
		if(categories.contains(packetDetails.packetCategory))goodCategory=true;
	    }
	    
	    var goodAction=false;
	    if(actions.contains('none'))goodAction=false;
	    else{
		if(actions.contains(packetDetails.packetAction))goodAction=true;
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
	    use =  (goodFilter || goodCategory || goodAction) && (goodMACto || goodMACfrom);
	    
	    if(use)blockACKEvents.push(packetDetails);
	}
	//console.log('The Block ACK events for this user are:\n' + JSON.stringify(blockACKEvents,null,2));
	console.log('This many Block ACK events ' + blockACKEvents.length);

	var receivedByEvents = [];
	//Let's find all of the packets received by that guy
	var target = probers[0].sourceAddress;
	filters.length = 0;
	filters.push('none');
	categories.length=0;
	categories.push('none');
	actions.length=0;
	actions.push('none');
	ToMacs.length=0;
	FromMacs.length=0;
	FromMacs.push(target);

	for(var a=0;a<allPackets.length;a++){
	    var packetDetails = allPackets[a];
	    
	    var goodFilter = false;
	    if(filters.contains('none'))goodFilter=false;
	    else{
		if(filters.contains(packetDetails.packetType))goodFilter=true;
	    }
	    
	    var goodCategory=false;
	    if(categories.contains('none'))goodCategory=false;
	    else{
		if(categories.contains(packetDetails.packetCategory))goodCategory=true;
	    }
	    
	    var goodAction=false;
	    if(actions.contains('none'))goodAction=false;
	    else{
		if(actions.contains(packetDetails.packetAction))goodAction=true;
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
	    //use =  (goodFilter || goodCategory || goodAction)&& goodMAC;
	    use = goodMACto||goodMACfrom;
	    
	    if(use)receivedByEvents.push(packetDetails);
	}
	//console.log('The events received by this user are:\n' + JSON.stringify(receivedByEvents,null,2));
	console.log('This many events from target ' + target + ': ' + receivedByEvents.length);

	var involvedWithEvents = [];
	//Let's find all of the packets sent by or received by that guy
	var target = probers[0].sourceAddress;
	filters.length = 0;
	filters.push('none');
	categories.length=0;
	categories.push('none');
	actions.length=0;
	actions.push('none');
	ToMacs.length=0;
	FromMacs.length=0;
	FromMacs.push(target);

	for(var a=0;a<allPackets.length;a++){
	    var packetDetails = allPackets[a];
	    
	    var goodFilter = false;
	    if(filters.contains('none'))goodFilter=false;
	    else{
		if(filters.contains(packetDetails.packetType))goodFilter=true;
	    }
	    
	    var goodCategory=false;
	    if(categories.contains('none'))goodCategory=false;
	    else{
		if(categories.contains(packetDetails.packetCategory))goodCategory=true;
	    }
	    
	    var goodAction=false;
	    if(actions.contains('none'))goodAction=false;
	    else{
		if(actions.contains(packetDetails.packetAction))goodAction=true;
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
	    //use =  (goodFilter || goodCategory || goodAction)&& goodMAC;
	    use = goodMACto||goodMACfrom;
	    
	    if(use)involvedWithEvents.push(packetDetails);
	}
	//console.log('The events in which this user are involved are :\n' + JSON.stringify(involvedWithEvents,null,2));
	console.log('This many events invoved with target ' + target + ': ' + involvedWithEvents.length);

	var channelSwitches = [];
	//Let's find all of the channel switch annoucements

	for(var a=0;a<allPackets.length;a++){
	    var packetDetails = allPackets[a];	    
	    if(packetDetails.csa.tagID>=0)channelSwitches.push(packetDetails);
	}
	//console.log('The events in which there is a channel switch annoucement are :\n' + JSON.stringify(channelSwitches,null,2));

	var roamingRSSIplot = [];
	//Let's find all of the packets to be used in the roaming RSSI plot
	filters.length = 0;
	filters.push('QoS Data');
	filters.push('NULL QoS Data');
	filters.push('EAPOL');
	filters.push('Block ACK');
	filters.push('Probe response');
	
	categories.length=0;
	categories.push('none');
	
	actions.length=0;
	actions.push('none');

	ToMacs.length=0;
	ToMacs.push(roamThisMAC);
	FromMacs.length=0;
	FromMacs.push('none');

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
	    use = goodFilter && goodCategory && goodAction;// && (goodMACto || goodMACfrom);
	    use = use && (packetDetails.receiverAddress==roamThisMAC || packetDetails.transmitterAddress==roamThisMAC);
	    
	    if(use)roamingRSSIplot.push(packetDetails);
	}
	//console.log('The events in which this user are involved are :\n' + JSON.stringify(involvedWithEvents,null,2));
	console.log('This many events in the roaming RSSI plot ' + roamingRSSIplot.length);

	var roamingRSSItable = [];
	//Let's find all of the packets to be used in the roaming RSSI table
	filters.length = 0;
	filters.push('Association request');
	filters.push('Association response');
	filters.push('Reassociation request');
	filters.push('Reassociation response');
	filters.push('Disassociate');
	filters.push('Authentication');
	filters.push('Deauthentication');
	filters.push('Action frames');
	categories.length=0;
	categories.push('WNM');
	categories.push('Radio Measurement');
	actions.length=0;
	actions.push('BSS Transition Management Query');
	actions.push('BSS Transition Management Request');
	actions.push('BSS Transition Management Response');
	ToMacs.length=0;
	ToMacs.push('none');
	FromMacs.length=0;
	FromMacs.push('none');

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
	    use = goodFilter && goodCategory && goodAction;// && (goodMACto || goodMACfrom);
	    use = use && (packetDetails.receiverAddress==roamThisMAC || packetDetails.transmitterAddress==roamThisMAC);
	    
	    if(use)roamingRSSItable.push(packetDetails);
	}
	//console.log('The events in which this user are involved are :\n' + JSON.stringify(involvedWithEvents,null,2));
	console.log('This many events in the roaming RSSI table ' + roamingRSSItable.length);

	console.log('This many events in the return fields ' + returnFields.length);
	//Don't let this be larger than, say, 100K
	//while(returnFields.length>100000)returnFields.pop();
	//console.log('This many events in the return fields ' + returnFields.length);

	console.log('The allMACs length is ' + allMACs.length);	
	while(allMACs.length>100)allMACs.pop();

	var more = false;
	if(packetNumber > maxPacketProcessed) more = true;

	console.log('Just before the response.json now.');

	//*/
	response.json({uploadFiles: uploadFiles,
		       errored: errorObj.errored,
		       errorMessage: errorObj.errorMessage,
		       totalPackets: packetNumber,
		       maxPacketProcessed:maxPacketProcessed,
		       packetsProcessed:packetsProcessed,
		       more: more,
		       text: returnText,
		       fields:returnFields,
		       firstTimestamp:firstTimestamp,
		       firstArrivalTime:firstArrivalTime,
		       firstMicrosecond:firstMicrosecond,
		       allMACs: allMACs.toString(),
		       //allPackets: allPackets,
		       topSender: target,
		       topResponders: responders,
		       mobilityEvents: mobilityEvents,
		       qosDataEvents: qosDataEvents,
		       probeResponseEvents: probeResponseEvents,
		       blockACKEvents: blockACKEvents,
		       receivedByEvents: receivedByEvents,
		       involvedWithEvents: involvedWithEvents,
		       channelSwitches: channelSwitches,
		       roamingRSSIplot: roamingRSSIplot,
		       roamingRSSItable: roamingRSSItable,
		       roamThisMAC: roamThisMAC
		      });
	//*/

	/*/
	response.json({uploadFiles: uploadFiles,
		       errored: errorObj.errored,
		       errorMessage: errorObj.errorMessage,
		       totalPackets: packetNumber,
		       maxPacketProcessed:maxPacketProcessed,
		       more: more,
		       firstArrivalTime:firstArrivalTime,
		       roamingRSSIplot: roamingRSSIplot,
		       roamingRSSItable: roamingRSSItable,
		       roamThisMAC: roamThisMAC
		      });
	//*/



    });
    
    return;
}
//...........................
function byte2bits(a)
{
    var tmp = "";
    for(var i = 128; i >= 1; i /= 2){
	//console.log('a=' + a + ' i=' + i + ' a&i= ' + a&i);
	//console.log('a=' + a + ' i=' + i + ' a&i= '+ parseInt(a,2)&i);
        tmp += a&i?'1':'0';
    }
    return tmp;
}
//............................
function getBits(bits,number)
{
    var binary="";
    for(var i=0;i<number;i++) binary += bits[i];
    return binary;
}
//..............................
function parsePresent(present)
{
    var retObj = {};
    
    var byte1 = present[0];
    var bits1 = byte2bits(parseInt(byte1,16));
    //console.log('First byte is ' + byte1 + ' with bits ' + bits1);
    if(bits1[7]=='1')retObj.TSFT = true; else retObj.TSFT = false;
    if(bits1[6]=='1')retObj.Flags = true; else retObj.Flags = false;
    if(bits1[5]=='1')retObj.Rate = true; else retObj.Rate = false;
    if(bits1[4]=='1')retObj.Channel = true; else retObj.Channel = false;
    if(bits1[3]=='1')retObj.FHSS = true; else retObj.FHSS = false;
    if(bits1[2]=='1')retObj.dBmAntennaSignal = true; else retObj.dBmAntennaSignal = false;
    if(bits1[1]=='1')retObj.dBmAntennaNoise = true; else retObj.dBmAntennaNoise = false;
    if(bits1[0]=='1')retObj.lockQuality = true; else retObj.lockQuality = false;

    var byte2 = present[1];
    var bits2 = byte2bits(parseInt(byte2,16));
    if(bits2[7]=='1')retObj.txAttenuation = true; else retObj.txAttenuation = false;
    if(bits2[6]=='1')retObj.dBtxAttenuation = true; else retObj.dBtxAttenuation = false;
    if(bits2[5]=='1')retObj.txPower = true; else retObj.txPower = false;
    if(bits2[4]=='1')retObj.antenna = true; else retObj.antenna = false;
    if(bits2[3]=='1')retObj.dBantennaSignal = true; else retObj.dBantennaSignal = false;
    if(bits2[2]=='1')retObj.dBantennaNoise = true; else retObj.dBantennaNoise = false;
    if(bits2[1]=='1')retObj.rxFlags = true; else retObj.rxFlags = false;

    var byte3 = present[2];
    var bits3 = byte2bits(parseInt(byte3,16));
    if(bits3[5]=='1')retObj.channelPlus = true; else retObj.channelPlus = false;
    if(bits3[4]=='1')retObj.MCS = true; else retObj.MCS = false;
    if(bits3[3]=='1')retObj.AMPDU = true; else retObj.AMPDU = false;
    if(bits3[2]=='1')retObj.VHT = true; else retObj.VHT = false;
    if(bits3[1]=='1')retObj.frameTimestamp = true; else retObj.frameTimestamp = false;

    var byte4 = present[3];
    var bits4 = byte2bits(parseInt(byte4,16));
    if(bits4[2]=='1')retObj.radiotapNSnext = true; else retObj.radiotapNSnext = false;
    if(bits4[1]=='1')retObj.vendorNSnext = true; else retObj.vendorNSnext = false;
    if(bits4[0]=='1')retObj.ext = true; else retObj.ext = false;

    
    return retObj;
}
//..............................
function parseFlags(flags)
{
    var retObj = {};
    
    var byte1 = flags;
    var bits1 = byte2bits(parseInt(byte1,16));
    if(bits1[7]=='1')retObj.CFP = true; else retObj.CFP = false;
    if(bits1[6]=='1')retObj.LongPreamble = false; else retObj.LongPreamble = true;
    if(bits1[5]=='1')retObj.WEP = true; else retObj.WEP = false;
    if(bits1[4]=='1')retObj.Fragmentation = true; else retObj.Fragmentation = false;
    if(bits1[3]=='1')retObj.FCS = true; else retObj.FCS = false;
    if(bits1[2]=='1')retObj.DataPad = true; else retObj.DataPad = false;
    if(bits1[1]=='1')retObj.BadFCS = true; else retObj.BadFCS = false;
    if(bits1[0]=='1')retObj.ShortGI = true; else retObj.ShortGI = false;
    
    return retObj;
}
//..............................
function parseChannel(channel)
{
    var retObj = {};
    
    var byte1 = channel[0];
    var bits1 = byte2bits(parseInt(byte1,16));
    if(bits1[3]=='1')retObj.Turbo = true; else retObj.Turbo = false;
    if(bits1[2]=='1')retObj.CCK = true; else retObj.CCK = false;
    if(bits1[1]=='1')retObj.OFDM = true; else retObj.OFDM = false;
    if(bits1[0]=='1')retObj.GHz2 = true; else retObj.GHz2 = false;

    var byte2 = channel[1];
    var bits2 = byte2bits(parseInt(byte2,16));
    if(bits2[7]=='1')retObj.GHz5 = true; else retObj.GHz5 = false;
    if(bits2[6]=='1')retObj.Passive = true; else retObj.Passive = false;
    if(bits2[5]=='1')retObj.DynamicCCKOFDM = true; else retObj.DynamicCCKOFDM = false;
    if(bits2[4]=='1')retObj.GFSK = true; else retObj.GFSK = false;
    if(bits2[3]=='1')retObj.GSM = true; else retObj.GSM = false;
    if(bits2[2]=='1')retObj.StaticTurbo = true; else retObj.StaticTurbo = false;
    if(bits2[1]=='1')retObj.HalfRateChannel = true; else retObj.HalfRateChannel = false;
    if(bits2[0]=='1')retObj.QuarterRateChannel = true; else retObj.QuarterRateChannel = false;
    
    return retObj;
}
//...........................................
function decodeSubtype(typeSubtype)
{
    var ret;
    var retObj = {};

    var byte1 = typeSubtype;
    var bits = byte2bits(parseInt(byte1,16));

    var version = parseInt(bits[7]) + 2*parseInt(bits[6]);
    var type = parseInt(bits[5]) + 2*parseInt(bits[4]);
    var subtype = parseInt(bits[3]) + 2*parseInt(bits[2]) + 4*parseInt(bits[1]) + 8*parseInt(bits[0]);

    var decimal = 16*type + subtype;

    //console.log(byte1, bits, version, type, subtype, decimal);
    
    if(typeSubtype=='00') ret='associationRequest';
    if(typeSubtype=='10') ret='associationResponse';
    if(typeSubtype=='a0') ret='disassociation';
    if(typeSubtype=='80') ret='beacon';
    if(typeSubtype=='88') ret='qosData';
    if(typeSubtype=='94') ret='blockACK';
    if(typeSubtype=='45') ret='null';
    if(typeSubtype=='d4') ret='ACK';
    if(typeSubtype=='d0') ret='action';
    if(typeSubtype=='c4') ret='cts';
    if(typeSubtype=='91') ret='ATIM';

    if(decimal ==  0) ret = 'Association request';
    if(decimal ==  1) ret = 'Association response';
    if(decimal ==  2) ret = 'Reassociation request';
    if(decimal ==  3) ret = 'Reassociation response';
    if(decimal ==  4) ret = 'Probe request';
    if(decimal ==  5) ret = 'Probe response';
    if(decimal ==  8) ret = 'Beacon';
    if(decimal ==  9) ret = 'Announcement traffic indication map (ATIM)';
    if(decimal ==  10) ret = 'Disassociate';
    if(decimal ==  11) ret = 'Authentication';
    if(decimal ==  12) ret = 'Deauthentication';
    if(decimal ==  13) ret = 'Action frames';
    if(decimal ==  24) ret = 'Block ACK Request';
    if(decimal ==  25) ret = 'Block ACK';
    if(decimal ==  26) ret = 'Power-Save Poll';
    if(decimal ==  27) ret = 'Request to Send';
    if(decimal ==  28) ret = 'Clear to Send';
    if(decimal ==  29) ret = 'ACK';
    if(decimal ==  30) ret = 'Contention Free Period End';
    if(decimal ==  31) ret = 'Contention Free Period End ACK';
    if(decimal ==  32) ret = 'Data';
    if(decimal ==  33) ret = 'Data + Contention Free ACK';
    if(decimal ==  34) ret = 'Data + Contention Free Poll';
    if(decimal ==  35) ret = 'Data + Contention Free ACK + Contention Free Poll';
    if(decimal ==  36) ret = 'NULL Data';
    if(decimal ==  37) ret = 'NULL Data + Contention Free ACK';
    if(decimal ==  38) ret = 'NULL Data + Contention Free Poll';
    if(decimal ==  39) ret = 'NULL Data + Contention Free ACK + Contention Free Poll';
    if(decimal ==  40) ret = 'QoS Data';
    if(decimal ==  41) ret = 'QoS Data + Contention Free ACK';
    if(decimal ==  42) ret = 'QoS Data + Contention Free Poll';
    if(decimal ==  43) ret = 'QoS Data + Contention Free ACK + Contention Free Poll';
    if(decimal ==  44) ret = 'NULL QoS Data';
    if(decimal ==  46) ret = 'NULL QoS Data + Contention Free Poll';
    if(decimal ==  47) ret = 'NULL QoS Data + Contention Free ACK + Contention Free Poll';

    retObj = {version:version,
	      type:type,
	      subtype:subtype,
	      name:ret};	      

    return retObj;
}
//..............................
function parseVHT(vht)
{
    var retObj = {};
    
    var byte1 = vht[0];
    var bits1 = byte2bits(parseInt(byte1,16));
    if(bits1[7]=='1')retObj.STBC = true; else retObj.STBC = false;
    if(bits1[6]=='1')retObj.TXOP_PS_NOT_ALLOWED = true; else retObj.TXOP_PS_NOT_ALLOWED = false;
    if(bits1[5]=='1')retObj.guardInterval = true; else retObj.guardInterval = false;
    if(bits1[4]=='1')retObj.SGI_Nsym_disambiguation = true; else retObj.SGI_Nsym_disambiguation = false;
    if(bits1[3]=='1')retObj.LDPC_extra_OFDM_symbol = true; else retObj.LDPC_extra_OFDM_symbol = false;
    if(bits1[2]=='1')retObj.beamformed = true; else retObj.beamformed = false;
    if(bits1[1]=='1')retObj.bandwidth = true; else retObj.bandwidth = false;
    if(bits1[0]=='1')retObj.groupID = true; else retObj.groupID = false;

    var byte2 = vht[1];
    var bits2 = byte2bits(parseInt(byte2,16));
    if(bits2[7]=='1')retObj.partialAID = true; else retObj.partialAID = false;
    
    return retObj;
}
//..............................
function parseGuard(vht)
{
    var retObj = {};
    
    var byte1 = vht[2];
    var bits1 = byte2bits(parseInt(byte1,16));
    if(bits1[5]=='1')retObj.shortGuardInterval = true; else retObj.shortGuardInterval = false;
    
    return retObj;
}
//..............................
function parseMCS(vht)
{
    var retObj = {};
    
    var byte1 = vht[4];
    var bits1 = byte2bits(parseInt(byte1,16));
    var mcs = 0;
    mcs = 8*parseInt(bits1[0]) + 4*parseInt(bits1[1]) + 2*parseInt(bits1[2]) + parseInt(bits1[3]);
    retObj.mcs = mcs;

    var nss = 0;
    nss = 8*parseInt(bits1[4]) + 4*parseInt(bits1[5]) + 2*parseInt(bits1[6]) + parseInt(bits1[7]);
    retObj.nss = nss;
    
    return retObj;
}
//........................................
function VHTrates(BW,MCS,streams,GI)
{
    var DRate;

 
    if (MCS == 0){
        if (BW == 20){
            if (GI == 800)  DRate = 6.5 * streams;
            if (GI == 400)  DRate = 7.2 * streams;
	}
        else if (BW ==40) {
            if (GI == 800)  DRate = 13.5 * streams;
            if (GI == 400)  DRate = 15 * streams;
	}
        else if (BW ==80) {
            if (GI == 800)  DRate = 29.3 * streams;
            if (GI == 400)  DRate = 32.5 * streams;
	}
        else if (BW ==160) {
            if (GI == 800)  DRate = 58.5 * streams;
            if (GI == 400)  DRate = 65 * streams;
	}
    }
    if (MCS == 1) {
        if (BW ==20) {
            if (GI == 800)  DRate = 13 * streams;
            if (GI == 400)  DRate = 14.4 * streams;
	}
        else if (BW ==40) {
            if (GI == 800)  DRate = 27 * streams;
            if (GI == 400)  DRate = 30 * streams;
	}
        else if (BW ==80) {
            if (GI == 800)  DRate = 58.5 * streams;
            if (GI == 400)  DRate = 65 * streams;
	}
        else if (BW ==160) {
            if (GI == 800)  DRate = 117 * streams;
            if (GI == 400)  DRate = 130 * streams;
	}
    }
    if (MCS == 2) {
        if (BW ==20) {
            if (GI == 800)  DRate = 19.5 * streams;
            if (GI == 400)  DRate = 21.7 * streams;
	}
        else if (BW ==40) {
            if (GI == 800)  DRate = 40.5 * streams;
            if (GI == 400)  DRate = 45 * streams;
	}
        else if (BW ==80) {
            if (GI == 800)  DRate = 87.8 * streams;
            if (GI == 400)  DRate = 97.5 * streams;
	}
        else if (BW ==160) {
            if (GI == 800)  DRate = 175.5 * streams;
            if (GI == 400)  DRate = 195 * streams;
	}
    }
    if (MCS == 3) {
        if (BW ==20) {
            if (GI == 800)  DRate = 26 * streams;
            if (GI == 400)  DRate = 28.9 * streams;
	}
        else if (BW ==40) {
            if (GI == 800)  DRate = 54 * streams;
            if (GI == 400)  DRate = 60 * streams;
	}
        else if (BW ==80) {
            if (GI == 800)  DRate = 117 * streams;
            if (GI == 400)  DRate = 130 * streams;
	}
        else if (BW ==160) {
            if (GI == 800)  DRate = 234 * streams;
            if (GI == 400)  DRate = 260 * streams;
	}
    }
    if (MCS == 4) {
        if (BW ==20) {
            if (GI == 800)  DRate = 39 * streams;
            if (GI == 400)  DRate = 43.3 * streams;
	}
        else if (BW ==40) {
            if (GI == 800)  DRate = 81 * streams;
            if (GI == 400)  DRate = 90 * streams;
	}
        else if (BW ==80) {
            if (GI == 800)  DRate = 175.5 * streams;
            if (GI == 400)  DRate = 195 * streams;
	}
        else if (BW ==160) {
            if (GI == 800)  DRate = 351 * streams;
            if (GI == 400)  DRate = 390 * streams;
	}
    }
    if (MCS == 5) {
        if (BW ==20) {
            if (GI == 800)  DRate = 52 * streams;
            if (GI == 400)  DRate = 57.8 * streams;
	}
        else if (BW ==40) {
            if (GI == 800)  DRate = 108 * streams;
            if (GI == 400)  DRate = 120 * streams;
	}
        else if (BW ==80) {
            if (GI == 800)  DRate = 234 * streams;
            if (GI == 400)  DRate = 260 * streams;
	}
        else if (BW ==160) {
            if (GI == 800)  DRate = 468 * streams;
            if (GI == 400)  DRate = 520 * streams;
	}
    }
    if (MCS == 6) {
        if (BW ==20) {
            if (GI == 800)  DRate = 58.5 * streams;
            if (GI == 400)  DRate = 65 * streams;
	}
        else if (BW ==40) {
            if (GI == 800)  DRate = 121.5 * streams;
            if (GI == 400)  DRate = 135 * streams;
	}
        else if (BW ==80) {
            if (GI == 800)  DRate = 263.3 * streams;
            if (GI == 400)  DRate = 292.5 * streams;
	}
        else if (BW ==160) {
            if (GI == 800)  DRate = 526.5 * streams;
            if (GI == 400)  DRate = 585 * streams;
	}
    }
    if (MCS == 7) {
        if (BW ==20) {
            if (GI == 800)  DRate = 65 * streams;
            if (GI == 400)  DRate = 72.2 * streams;
	}
        else if (BW ==40) {
            if (GI == 800)  DRate = 135 * streams;
            if (GI == 400)  DRate = 150 * streams;
	}
        else if (BW ==80) {
            if (GI == 800)  DRate = 292.5 * streams;
            if (GI == 400)  DRate = 325 * streams;
	}
        else if (BW ==160) {
            if (GI == 800)  DRate = 585 * streams;
            if (GI == 400)  DRate = 650 * streams;
	}
    }
    if (MCS == 8) {
        if (BW ==20) {
            if (GI == 800)  DRate = 78 * streams;
            if (GI == 400)  DRate = 86.7 * streams;
	}
        else if (BW ==40) {
            if (GI == 800)  DRate = 162 * streams;
            if (GI == 400)  DRate = 180 * streams;
	}
        else if (BW ==80) {
            if (GI == 800)  DRate = 351 * streams;
            if (GI == 400)  DRate = 390 * streams;
	}
        else if (BW ==160) {
            if (GI == 800)  DRate = 702 * streams;
            if (GI == 400)  DRate = 780 * streams;
	}
    }
    if (MCS == 9) {
        if (BW == 20) {
            if (GI == 800)  DRate = 86.67 * streams;
            if (GI == 400)  DRate = 96.3 * streams;
	}
        else if (BW == 40) {
            if (GI == 800)  DRate = 180 * streams;
            if (GI == 400)  DRate = 200 * streams;
	}
        else if (BW == 80) {
            if (GI == 800)  DRate = 390 * streams;
            if (GI == 400)  DRate = 433.3 * streams;
	}
        else if (BW == 160) {
            if (GI == 800)  DRate = 780 * streams;
            if (GI == 400)  DRate = 866.7 * streams;
	}
    }
        
    if (MCS == 9 && BW == 20 && streams == 1)  DRate = -1;
    if (MCS == 9 && BW == 20 && streams == 2)  DRate = -1;
    if (MCS == 9 && BW == 20 && streams == 4)  DRate = -1;
    if (MCS == 6 && BW == 80 && streams == 3)  DRate = -1;

    return DRate;
}
//..............................................................................
function parseBandwidth(bwHex)
{
    var retObj = {};

    var val = parseInt(bwHex,16);
    if(val==0){
	retObj.bandwidthMHz=20;
	retObj.sideband=null;
	retObj.sidebandIndex=null;
    }
    else if(val==1){
	retObj.bandwidthMHz=40;
	retObj.sideband=null;
	retObj.sidebandIndex=null;
    }
    else if(val==2){
	retObj.bandwidthMHz=40;
	retObj.sideband='20L';
	retObj.sidebandIndex=0;
    }
    else if(val==3){
	retObj.bandwidthMHz=40;
	retObj.sideband='20U';
	retObj.sidebandIndex=1;
    }
    else if(val==4){
	retObj.bandwidthMHz=80;
	retObj.sideband=null;
	retObj.sidebandIndex=null;
    }
    else if(val==5){
	retObj.bandwidthMHz=80;
	retObj.sideband='40L';
	retObj.sidebandIndex=0;
    }
    else if(val==6){
	retObj.bandwidthMHz=80;
	retObj.sideband='40U';
	retObj.sidebandIndex=1;
    }
    else if(val==7){
	retObj.bandwidthMHz=80;
	retObj.sideband='20LL';
	retObj.sidebandIndex=0;
    }
    else if(val==8){
	retObj.bandwidthMHz=80;
	retObj.sideband='20LU';
	retObj.sidebandIndex=1;
    }
    else if(val==9){
	retObj.bandwidthMHz=80;
	retObj.sideband='20UL';
	retObj.sidebandIndex=2;
    }
    else if(val==10){
	retObj.bandwidthMHz=80;
	retObj.sideband='20UU';
	retObj.sidebandIndex=3;
    }
    else if(val==11){
	retObj.bandwidthMHz=160;
	retObj.sideband=null;
	retObj.sidebandIndex=null;
    }
    else if(val==12){
	retObj.bandwidthMHz=160;
	retObj.sideband='80L';
	retObj.sidebandIndex=0;
    }
    else if(val==13){
	retObj.bandwidthMHz=160;
	retObj.sideband='80U';
	retObj.sidebandIndex=1;
    }
    else if(val==14){
	retObj.bandwidthMHz=160;
	retObj.sideband='40LL';
	retObj.sidebandIndex=0;
    }
    else if(val==15){
	retObj.bandwidthMHz=160;
	retObj.sideband='40LU';
	retObj.sidebandIndex=1;
    }
    else if(val==16){
	retObj.bandwidthMHz=160;
	retObj.sideband='40UL';
	retObj.sidebandIndex=2;
    }
    else if(val==17){
	retObj.bandwidthMHz=160;
	retObj.sideband='40UU';
	retObj.sidebandIndex=2;
    }
    else if(val==18){
	retObj.bandwidthMHz=160;
	retObj.sideband='20LLL';
	retObj.sidebandIndex=0;
    }
    else if(val==19){
	retObj.bandwidthMHz=160;
	retObj.sideband='20LLU';
	retObj.sidebandIndex=1;
    }
    else if(val==20){
	retObj.bandwidthMHz=160;
	retObj.sideband='20LUL';
	retObj.sidebandIndex=2;
    }
    else if(val==21){
	retObj.bandwidthMHz=160;
	retObj.sideband='20LUU';
	retObj.sidebandIndex=3;
    }
    else if(val==22){
	retObj.bandwidthMHz=160;
	retObj.sideband='20ULL';
	retObj.sidebandIndex=4;
    }
    else if(val==23){
	retObj.bandwidthMHz=160;
	retObj.sideband='20ULU';
	retObj.sidebandIndex=5;
    }
    else if(val==24){
	retObj.bandwidthMHz=160;
	retObj.sideband='2UUL';
	retObj.sidebandIndex=6;
    }
    else if(val==25){
	retObj.bandwidthMHz=160;
	retObj.sideband='2UUU';
	retObj.sidebandIndex=6;
    }
    
    


    return retObj;
}
//.................................................
function parseFrag(frag)
{
    var retObj = {};
    
    var byte1 = frag[0];
    var bits1 = byte2bits(parseInt(byte1,16));

    var f = 0;
    for(var i=7;i>=4;i--) f += Math.pow(2,7-i)*parseInt(bits1[i]);
    retObj.fragment = f;

    var s = 0;
    for(var i=3;i>=0;i--) s += Math.pow(2,3-i)*parseInt(bits1[i]);
    
    var byte2 = frag[1];
    var bits2 = byte2bits(parseInt(byte2,16));
    for(var i=7;i>=0;i--) s += Math.pow(2,7-i+4)*parseInt(bits2[i]);
    retObj.sequence = s;

    return retObj;
}
//.....................................................
function decodeCategory(categoryCode)
{
    //Table 9-47  Category Values

    var cat = parseInt(categoryCode,16);
    var category = null;
    if     (cat==0)category="Spectrum Management";
    else if(cat==1)category="QoS";
    else if(cat==2)category="DLS";
    else if(cat==3)category="Block ACK";
    else if(cat==4)category="Public";
    else if(cat==5)category="Radio Measurement";
    else if(cat==6)category="Fast BSS Transition";
    else if(cat==7)category="HT";
    else if(cat==8)category="SA Query";
    else if(cat==9)category="Protected Dual of Public Action";
    else if(cat==10)category="WNM";
    else if(cat==11)category="Unprotected WNM";
    else if(cat==12)category="TDLS";
    else if(cat==13)category="Mesh";
    else if(cat==14)category="Multihop";
    else if(cat==15)category="Self-protected";
    else if(cat==16)category="DMG";
    else if(cat==17)category="Wi-FI Alliance";
    else if(cat==18)category="Fast Session Transfer";
    else if(cat==19)category="Robust AV Streaming";
    else if(cat==20)category="Unprotected DMG";
    else if(cat==21)category="VHT";
    
    return category;
}
//..............................................................
function decodeActionCode(categoryCode,actionCode)
{
    var cat = parseInt(categoryCode,16);
    var act = parseInt(actionCode,16);
    var action=null;

    //Pulling this stuff right out of the spec.   Table 9-47 gives the category values.  And in that table is the subclause for each category.
    
    if(cat==0){ //Spectrum management
	if(act==0)action="Measurement Request";
	if(act==1)action="Measurement Report";
	if(act==2)action="TPC Request";
	if(act==3)action="TPC Report";
	if(act==4)action="Channel switch announcement";
    }
	
    if(cat==1){ //QoS
	if(act==0)action="ADDTS Request";
	if(act==1)action="ADDTS Response";
	if(act==2)action="DELTS";
	if(act==3)action="Schedule";
	if(act==4)action="QoS Map Configure";
	if(act==5)action="ADDTS Reserve Request";
	if(act==6)action="ADDTS Reserve Response";
    }
	
    if(cat==2){ //DLS
	if(act==0)action="DLS Request";
	if(act==1)action="DLS Response";
	if(act==2)action="DLS Teardown";
    }
	
    if(cat==3){ //Block Ack
	if(act==0)action="Add Block Ack Request";
	if(act==1)action="Add Block Ack Response";
	if(act==2)action="DELBA";
    }
	
    if(cat==4){ //Public  Table 9-307.  
	if(act==0)action="20/40 BSS Coexistence Management";
    }
	
    if(cat==5){ //Radio Measurement
	if(act==0)action="Radio Measurement Request";
	if(act==1)action="Radio Measurement Report";
	if(act==2)action="Link Measurement Request";
	if(act==3)action="Link Measurement Report";
	if(act==4)action="Neighbor Report Request";
	if(act==5)action="Neighbor Report Response";
    }
    
    if(cat==6){ //Fast BSS Transition
	if(act==0)action="Reserved";
	if(act==1)action="FT Request Frames";
	if(act==2)action="FT Response Frames";
	if(act==2)action="FT Confirm Frames";
	if(act==2)action="FT ACK Frames";
    }	
	
    if(cat==7){ //High Throughput
	if(act==0)action="Notify Channel Width";
	if(act==1)action="SM Power Save";
	if(act==2)action="PSMP";
	if(act==3)action="Set PCO Phase";
	if(act==4)action="CSI";
	if(act==5)action="Noncompressed Beamforming";
	if(act==6)action="Compressed Beamforming";
	if(act==7)action="ASEL Indices Feedback";
    }

    if(cat==8){ //SQ Query
    }
	    
    if(cat==9){ //Protected dual of public action
    }
	
    if(cat==10){ //WNM
	if(act==0)action="Event Request";
	if(act==1)action="Event Report";
	if(act==2)action="Diagnostic Request";
	if(act==3)action="Diagnostic Report";
	if(act==4)action="Location Configuration Request";
	if(act==5)action="Location Configuration Response";
	if(act==6)action="BSS Transition Management Query";
	if(act==7)action="BSS Transition Management Request";
	if(act==8)action="BSS Transition Management Response";
	if(act==9)action="FMS Request";
	if(act==10)action="FMS Response";
	if(act==11)action="Collocated Interference Request";
	if(act==12)action="Collocated Interference Report";
	if(act==13)action="TFS Request";
	if(act==14)action="TFS Response";
	if(act==15)action="TFS Notify";
	if(act==16)action="WNM Sleep Mode Request";
	if(act==17)action="WNM Sleep Mode Response";
	if(act==18)action="TIM Broadcast Request";
	if(act==19)action="TIM Broadcast Response";
	if(act==20)action="QoS Traffic Capability Update";
	if(act==21)action="Channel Usage Request";
	if(act==22)action="Channel Usage Response";
	if(act==23)action="DMS Request";
	if(act==24)action="DMS Response";
	if(act==25)action="Timing Measurement Request";
	if(act==26)action="WNM Notification Request";
	if(act==27)action="WNM Notification Response";
	if(act==28)action="WNM-Notify Response";
    }

    if(cat==11){ //Unprotected WNM
	if(act==0)action="TDLS Setup Request";
	if(act==1)action="TDLS Setup Response";
	if(act==2)action="TDLS Setup Confirm";
	if(act==3)action="TDLS Teardown";
	if(act==4)action="TDLS Peer Traffic Indication";
	if(act==5)action="TDLS Channel Switch Request";
	if(act==6)action="TDLS Channel Switch Response";
	if(act==7)action="TDLS Peer PSM Request";
	if(act==8)action="TDLS Peer PSM Response";
	if(act==9)action="TDLS Peer Traffic Response";
	if(act==10)action="TDLS Discovery Request";
    }
    
    if(cat==12){ //TDLS
	if(act==0)action="TIM";
	if(act==1)action="Timing Measurement";
    }
    
    if(cat==18){ //Fast Session Transfer
	if(act==0)action="FST Setup Request";
	if(act==1)action="FST Setup Response";
	if(act==2)action="FST Teardown";
	if(act==3)action="FST Ack Request";
	if(act==4)action="FST Ack Response";
	if(act==5)action="On-channel Tunnel Request";
    }


    
    return action;
}
//.....................................................................
function decodeFlags(fcFlags)
{
    var retObj = {};
    
    var byte1 = fcFlags;
    var bits1 = byte2bits(parseInt(byte1,16));

    retObj.toDS            = parseInt(bits1[7]);
    retObj.fromDS          = parseInt(bits1[6]);
    retObj.moreFrag        = parseInt(bits1[5]);
    retObj.retry           = parseInt(bits1[4]);
    retObj.powerManagement = parseInt(bits1[3]);
    retObj.moreData        = parseInt(bits1[2]);
    retObj.protectedData   = parseInt(bits1[1]);
    retObj.strictlyOrdered = parseInt(bits1[0]);
    
    return retObj;
}
//......................................................................
function parseQoS(byteArray)
{
    var retObj={};

    var byte1 = byteArray[0];
    var bits1 = byte2bits(parseInt(byte1,16));

    var priority = 0;
    for(var i=7;i>=5;i--) priority += Math.pow(2,7-i)*parseInt(bits1[i]);
    retObj.priority = priority;
    
    retObj.QosBit          = parseInt(bits1[3]);
    
    var ackPolicy = 0;
    for(var i=2;i>=1;i--) ackPolicy += Math.pow(2,7-i)*parseInt(bits1[i]);
    retObj.ackPolicy = ackPolicy;

    retObj.payloadType     = parseInt(bits1[0]);

    var byte2 = byteArray[1];
    var bits2 = byte2bits(parseInt(byte2,16));

    var txopDurationRequested = 0;
    for(var i=7;i>=0;i--) txopDurationRequested += Math.pow(2,7-i)*parseInt(bits2[i]);
    retObj.txopDurationRequested = txopDurationRequested;

    return retObj;
}
//..........................................................................
function whoSent(type,allPackets)
{
    //Make the array that holds the results, along with methods for finding the occurance of a specific source address, for example.
    var arr = [];
    arr.contains = function(x){
	var contains = -1;
	for(var i=0;i<arr.length;i++){
	    if(arr[i].sourceAddress==x){
		contains = i;
		break;
	    }
	}
	return contains;
    }
    //Fill up the array.  Each entry is an object with the address of the guy sending this packet type, and the count.
    for(var a=0;a<allPackets.length;a++){
	if(allPackets[a].type==type){
	    var ipt = arr.contains(allPackets[a].transmitterAddress);
	    if(ipt>=0) arr[ipt].count++;
	    else arr.push({sourceAddress: allPackets[a].transmitterAddress, count: 1});
	}
    }

    var retArray = [];
    //Re-order this array so that the counts are in descending order.
    //console.log(JSON.stringify(arr,null,2));
    while(arr.length>0){
	var max = -1;
	var ipt = -1;
	for(var j=0;j<arr.length;j++){
	    if(arr[j].count>max){
		max = arr[j].count;
		ipt = j;
	    }
	}
	//console.log('Identified highest at ' + ipt);
	retArray.push(arr[ipt]);
	arr.splice(ipt,1);
	//console.log('arr length is ' + arr.length);
    }
    //console.log(JSON.stringify(retArray,null,2));
    
    return retArray;
}
//..........................................................................
function whoSentTo(address,allPackets)
{
    //Make the array that holds the results, along with methods for finding the occurance of a specific source address, for example.
    var arr = [];
    arr.contains = function(x){
	var contains = -1;
	for(var i=0;i<arr.length;i++){
	    if(arr[i].sourceAddress==x){
		contains = i;
		break;
	    }
	}
	return contains;
    }
    //Fill up the array.  Each entry is an object with the address of the guy sending this packet type, and the count.
    for(var a=0;a<allPackets.length;a++){
	if(allPackets[a].receiverAddress==address){
	    var ipt = arr.contains(allPackets[a].transmitterAddress);
	    if(ipt>=0) arr[ipt].count++;
	    else arr.push({sourceAddress: allPackets[a].transmitterAddress, count: 1});
	}
    }

    var retArray = [];
    //Re-order this array so that the counts are in descending order.
    //console.log(JSON.stringify(arr,null,2));
    while(arr.length>0){
	var max = -1;
	var ipt = -1;
	for(var j=0;j<arr.length;j++){
	    if(arr[j].count>max){
		max = arr[j].count;
		ipt = j;
	    }
	}
	//console.log('Identified highest at ' + ipt);
	retArray.push(arr[ipt]);
	arr.splice(ipt,1);
	//console.log('arr length is ' + arr.length);
    }
    //console.log(JSON.stringify(retArray,null,2));
    
    return retArray;
}
//.....................................................................................
function decodeLLC(byteArray)
{
    var retObj={};

    retObj.DSAP = byteArray[0];
    retObj.SSAP = byteArray[1];
    retObj.controlField = byteArray[2];
    retObj.organizationCode = [byteArray[3],byteArray[4],byteArray[5]];
    retObj.Type = [byteArray[6],byteArray[7]];

    return retObj;
}
//.....................................................................................
function parseIpv4(byteArray)
{
    var retObj={};
    
    var byte1 = byteArray[0];
    var bits1 = byte2bits(parseInt(byte1,16));

    var version = 0;
    for(var i=3;i>=0;i--) version += Math.pow(2,3-i)*parseInt(bits1[i]);
    retObj.version = version;

    var headerLength = 0;
    for(var i=7;i>=4;i--) headerLength += Math.pow(2,7-i)*parseInt(bits1[i]);
    retObj.headerLength = headerLength;

    retObj.diffServ = byteArray[1];

    retObj.totalLength = parseInt(byteArray[2],16) * 16 + parseInt(byteArray[3],16);

    retObj.identification = [byteArray[4],byteArray[5]];
    retObj.flags = [byteArray[4],byteArray[6]];
    retObj.TTL = parseInt(byteArray[8],16);
    retObj.protocol = parseInt(byteArray[9],16);
    if(retObj.protocol==1) retObj.protocolName = 'ICMP';
    if(retObj.protocol==2) retObj.protocolName = 'IGMP';

    return retObj;
}
//.........................................
function parseDuration(byteArray)
{
    var microsec;
    
    var byte1 = byteArray[0];
    var bits1 = byte2bits(parseInt(byte1,16));

    var microsec = 0;
    for(var i=7;i>=0;i--) microsec += Math.pow(2,7-i)*parseInt(bits1[i]);

    var byte2 = byteArray[1];
    var bits2 = byte2bits(parseInt(byte2,16));

    for(var i=7;i>=1;i--) microsec += Math.pow(2,15-i)*parseInt(bits2[i]);    

    return microsec;

}
//...............................................
function decodeBeaconTagged(Beacon)
{
    var bytes = Beacon.tagged.bytes;
    var ipnt = 0;
    Beacon.tagged.tags = [];
    Beacon.tagged.tags.locate = function(name){
	var index = -1;
	for (var t=0;t<Beacon.tagged.tags.length;t++){
	    if(Beacon.tagged.tags[t].tagName==null)continue;
	    if(Beacon.tagged.tags[t].tagName.toLowerCase().trim() == name.toLowerCase().trim()) {
		index=t;
		break;
	    }
	}
	return index;
    }

    while (ipnt<bytes.length){
	var tagNumber = bytes[ipnt];
	var tagLength = parseInt(bytes[ipnt+1],16);
	var tag = []; for(var i=0;i<tagLength;i++) tag.push(bytes[ipnt+2+i]);
	Beacon.tagged.tags.push({tagName: tagNumberToName(tagNumber), tagNumber: tagNumber, tagLength: tagLength, bytes: tag});
	ipnt += tagLength + 2;
    }    
    
    return Beacon.tagged;
}
//.................................................
function tagNumberToName(tagNumber)
{
    var tn = parseInt(tagNumber,16);
    var tagName = null;
    if(tn==0) tagName = 'SSID Parameter Set';
    if(tn==1) tagName = 'Supported Rates';
    if(tn==3) tagName = 'DS Parameter Set';
    if(tn==5) tagName = 'Traffic Indication Map';
    if(tn==32)tagName = 'Power Constraint';
    if(tn==37)tagName = 'Channel Switch Announcement';
    if(tn==45)tagName = 'HT Capabilities';
    if(tn==61)tagName = 'HT Information';
    if(tn==70)tagName = 'RM Enabled Capabilities';
    if(tn==127)tagName ='Extended Capabilities';
    if(tn==191)tagName ='VHT Capabilities';
    if(tn==192)tagName ='VHT Operation';
    if(tn==195)tagName ='VHT Tx Power Envelope';
    if(tn==196)tagName ='Channel Switch Wrapper';
    if(tn==221)tagName ='Vendor Specific';

    return tagName;
}
    
