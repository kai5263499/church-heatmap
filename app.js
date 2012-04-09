var Canvas = require('canvas'),
  os = require("os"),
  sys = require("sys"),
  gmu = require("./public/javascripts/GoogleMapUtils"),
  hmu = require("./public/javascripts/HeatMapUtils"),
  fs = require('fs'),
  express = require('express'),
  Db = require('mongodb').Db,
  Connection = require('mongodb').Connection,
  Server = require('mongodb').Server,
  BSON = require('mongodb').BSONNative,
  io = require('socket.io'),
  yaml = require('yaml'),
  zmq = require('zeromq');

zeromq_conf = yaml.eval(fs.readFileSync(__dirname+'/config/zeromq.yml').toString());
mongo_conf = yaml.eval(fs.readFileSync(__dirname+'/config/mongo.yml').toString());

MOZILLA_LIMIT = 100;
WEBKIT_LIMIT  = 500;

var db = new Db(mongo_conf[os.hostname()].db, new Server(mongo_conf[os.hostname()].host, mongo_conf[os.hostname()].port, {}), {auto_reconnect: true, native_parser:true});

var pointscollection;

db.open(function(err, automatic_connect_client) {
  db.authenticate(mongo_conf[os.hostname()].user, mongo_conf[os.hostname()].pass, function(err, replies) {
	db.collection(mongo_conf[os.hostname()].points_collection, function(err, coll) {
		console.log("mongodbdb setup completed");
		pointscollection = coll;
	});
  });
});

var createTile = function(cfg) {
	
	if(!cfg || !cfg.x || !cfg.y || !cfg.z || (!cfg.sock && !cfg.res)) {
		console.log("whoops, looks like we're missing something... "+JSON.stringify(cfg));
		return;
	}
	
	var X = cfg.x,
		Y = cfg.y,
		Z = cfg.z;
	
	process_image_data = true;
	if(typeof cfg.process_image_data == "boolean") process_image_data = cfg.process_image_data;
	
    if(process_image_data) {
        var canvas = new Canvas(GoogleMapUtils.TILE_SIZE, GoogleMapUtils.TILE_SIZE);
        var ctx = canvas.getContext('2d');
    }
    
    exactsize = false;
    if(cfg.exactsize) exactsize = true;
    
    var extents = GoogleMapUtils.calcExtents(X, Y, Z, exactsize);
	
	var query = {'loc':{'$within':{'$box':[[extents.swlat, extents.swlng],[extents.nelat, extents.nelng]]}}};
	
	if(!pointscollection && cfg.sock) {
        cfg.sock.send(JSON.stringify({"error":"pointscollection not ready!"}));
	}
	
	pointscollection.find(query,function(err, cursor) {
        if(err) {
            cfg.sock.send(JSON.stringify({"error":err}));
        }
        
        cursor.toArray(function(err, items) {
			console.log("processing "+items.length+" documents for X:"+X+" Y:"+Y+" Z:" + Z);
			
			heatitems = [];
			
            var browser_limit = 0;
            if(cfg.browser) {
                browser_limit = cfg.browser.webkit ? WEBKIT_LIMIT : MOZILLA_LIMIT;
            }
            
			if(items.length < 1) {
				if(cfg.dataurl && cfg.sock) {
					cfg.sock.send(JSON.stringify({x:X,y:Y,z:Z,"tiledata":null,"numpoints":items.length}));
					return;
				}
			} else if(cfg.browser && !cfg.browser.msie && items.length <= browser_limit) {
				process_image_data = false;
			}
			
			for(i=0;i<items.length;i++) {
				//console.log("doc :" + sys.inspect(items[i]));
				if(!items[i].loc || !items[i].loc.lat || !items[i].loc.lon) {
					continue;
				}
				
				if(process_image_data) {
					point = new GoogleMapUtils.getOffsetPixelCoords(items[i].loc.lat,items[i].loc.lon,Z,X,Y);
					hmu.HeatMapUtils.addHeatPointData(ctx, point);
				} else {
					//heatitems.push(items[i]);
				}
                
                
			}

            if(!process_image_data) {
                heatitems = items;
            }
            
			if(!process_image_data && cfg.sock) {
				cfg.sock.send(JSON.stringify({x:X,y:Y,z:Z,"items":heatitems,"numpoints":heatitems.length}));
				return;
			}

			if(cfg.dataurl && cfg.sock) {
				canvas.toDataURL('image/png', function(err, str) {
					cfg.sock.send(JSON.stringify({x:X,y:Y,z:Z,"tiledata":str,"numpoints":items.length}));
				});
			}
			
			stream = canvas.createPNGStream();
			var out = fs.createWriteStream(__dirname+'/public/tile/'+X+'-'+Y+'-'+Z+'.png')
			
			stream.on('data', function(chunk){
				if(cfg.res) cfg.res.write(chunk);
				out.write(chunk);
			});

			stream.on('end', function(){
				if(cfg.res) cfg.res.end();
				stream.close();
				out.close();
			});
		});
	});
};

var app = module.exports = express.createServer();

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.logger());
  app.use(express.bodyDecoder());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.staticProvider(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

app.get('/', function(req, res){
	res.redirect('index.html');
});

function returnPNGFile(res, X, Y, Z) {
    stream = fs.createReadStream(__dirname+'/public/tile/'+X+'-'+Y+'-'+Z+'.png');
    stream.on('data', function(chunk){
        res.write(chunk);
    });

    stream.on('end', function(){
        res.end();
    });
}

app.get('/tile/:x-:y-:z.png', function(req, res){
	var X = req.params.x;
	var Y = req.params.y;
	var Z = req.params.z;
	
	fs.stat(__dirname+'/public/tile/'+X+'-'+Y+'-'+Z+'.png',function(err, stats) {
		if(err == null && stats.isFile()) {
			console.log("serving cache file for: "+X+'-'+Y+'-'+Z+'.png');
			
			returnPNGFile(res, X, Y, Z);
		} else {
			console.log("generating tile for "+X+'-'+Y+'-'+Z+'.png');
			
			createTile({
				x:req.params.x,
				y:req.params.y,
				z:req.params.z,
				res:res
			});
		}
	});
});

app.get('/tile/:x-:y-:z', function(req, res){
	createTile({
		x:req.params.x,
		y:req.params.y,
		z:req.params.z,
		process_image_data:false,
		browser:req.param('browser'),
		res:res
	});
});

process.on('exit', function () {
	db.close();
});

var io = io.listen(app)
	  , buffer = [];
	  
io.on('connection', function(client){
  //client.send({ buffer: buffer });
  //client.broadcast({ announcement: client.sessionId + ' connected' });
  
  client.on('message', function(message){
	//var msg = { message: [client.sessionId, message] };
	//console.log('msg: '+JSON.stringify(message));
	
    if(message.bounds) {
        //console.log("bounds query: "+JSON.stringify(message));
        
        var query = {'loc':{'$within':{'$box':[[message.bounds.W.b, message.bounds.P.d],[message.bounds.W.d, message.bounds.P.b]]}}};
        
        //console.log("mongo query: "+JSON.stringify(query));
        
        if(!pointscollection) {
			client.send(JSON.stringify({"error":"pointscollection not ready!"}));
		}
        
        pointscollection.find(query,function(err, cursor) {
            if(message.summary) {
			} else {
	            var buffer = [];
				cursor.toArray(function(err, items) {
					
					for(i=0; i < items.length; i++) {
						buffer.push(items[i]);
						
						if(i > 0 && i%250 == 0) {
							console.log("sending back "+buffer.length+" documents");
							client.send({items:buffer,"partial":true});
							buffer = [];
						}
					}
					
					console.log("sending back "+buffer.length+" documents");
					client.send({items:buffer,"complete":true});
				});
			}
		});
        
        return;
    }
    
    
    if(typeof message.process_image_data == "boolean" && !message.process_image_data) {
        createTile({
            x:message.coord.x,
            y:message.coord.y,
            z:message.zoom,
            process_image_data:false,
            browser:message.browser,
            sock:client
        });
        
        return;
    }
    
	fs.stat(__dirname+'/public/tile/'+message.coord.x+'-'+message.coord.y+'-'+message.zoom+'.png',function(err, stats) {
		if(err == null && stats.isFile()) {
			client.send({x:message.coord.x,y:message.coord.y,z:message.zoom,"getimage":true});
		} else {
			createTile({
				x:message.coord.x,
				y:message.coord.y,
				z:message.zoom,
				dataurl:true,
				browser:message.browser,
				sock:client
			});
		}
	});
	
	//buffer.push(msg);
	//if (buffer.length > 15) buffer.shift();
	//client.broadcast(msg);
  });

  client.on('disconnect', function(){
	//client.broadcast({ announcement: client.sessionId + ' disconnected' });
  });
});

if(!module.parent) {
	app.listen(3000);
	console.log("Express server listening on port %d", app.address().port);
}
