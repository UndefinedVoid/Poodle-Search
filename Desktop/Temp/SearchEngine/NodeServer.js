"use strict";

process.title = "Search Engine";

var webSocketsServerPort = 1234;
var webSocketServer = require('websocket').server;
var http = require('http');
var mongoDb = require('mongodb').MongoClient;
var fs = require('fs');
var dbUrl = "mongodb://localhost:27017/";
var clients = [];

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

var url = require("url");
var st = require('node-static');
var fileServer = new st.Server('./');

var server = http.createServer(function (request, response) {
    var _get = url.parse(request.url, true).query;
    fileServer.serve(request, response);

});
server.listen(webSocketsServerPort, function () {
    console.log((new Date()) + " SearchEngine Started ");
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
    console.log((new Date()) + " Site Address : http://localhost:" + webSocketsServerPort);
   });
var wsServer = new webSocketServer({
    httpServer: server
});
function multiSearchOr(text, searchWords){

    for(var i=0; i<searchWords.length; i++)
    {
     if(text.indexOf(searchWords[i]) == -1)
       return('Not Found!');
    }
    return('Found!');
 }
 

wsServer.on('request', function (request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
    var connection = request.accept(null, request.origin);
    var index = clients.push(connection) - 1;
    console.log((new Date()) + ' Connection accepted.');
  connection.on('message', function(message) {
    var json = JSON.parse(message.utf8Data);
   
        if (json.type === 'search') {
            var searchReq = json.data;
            var lowerReq = searchReq.toLowerCase();
            console.log((new Date()) + " Client Sent Search Request for "+lowerReq);
            mongoDb.connect(dbUrl, function (err, db, request, response) {
                if (err) throw err;
                var dbo = db.db("search");
                var sites = {name:lowerReq};
                // db.sites.find( { $text: { $search:'Divy is Dhairy'} } ).forEach(function(index,items) {})

                dbo.collection("sites").find({ $text: { $search: lowerReq } }).toArray(function(err,result) {
                    if (err) throw err;
                    if (result != 0) {
                        var intCount = result.length;
                        console.log(intCount)
                       
              if (intCount > 0) {
                var strJson = "";
                for (var i = 0; i < intCount;) {
                  var r1 = result[i].name;
                  var r2 = result[i].address;
                  i = i + 1;
                  console.log((new Date()) + " Results Are " + r1);
                connection.sendUTF(JSON.stringify({type:'site',data:r1,data2:r2}));
                  if (i < intCount) {
                    strJson += ',';
                  }
                }
                
              }
                 else if (intCount == 0)     {
                    connection.sendUTF(JSON.stringify({ type: 'add', data: lowerReq }));
                 }
                           
                    
                }
                    else {
                        console.log((new Date())+' Not Found...');
                        connection.sendUTF(JSON.stringify({ type: 'add', data: lowerReq }));
                    }
                    db.close();
                });
            });
        }
        else if (json.type === 'addIt') {
            var siteToadd = json.data;
            var siteAdd = json.data2;
            var low1 = siteToadd.toLowerCase();
            var low2 = siteAdd.toLowerCase();
            console.log((new Date()) + " Client Sent 'Add' Request for "+low1);
            mongoDb.connect(dbUrl, function (err, db, request, response) {
                if (err) throw err;
                var dbo = db.db("search");
                var sites = {name: low1,address: low2};

                dbo.collection("sites").insertOne({ name:sites.name,address:sites.address }, function (err, result) {
                    if (err) throw err;
                    
                        console.log((new Date()) + " Inserted : " + sites.address);
                      //  connection.sendUTF(JSON.stringify({ type: 'site', data: result.address }));

                      
                    
                    db.close();
                });
            });
        }
    
  });  
});