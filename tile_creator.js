var Canvas = require('canvas'),
	os = require("os"),
	sys = require("sys"),
	fs = require('fs'),
	zmq = require('zeromq'),
	util = require('util'),
	yaml = require('yaml'),
	net = require('net'),
	gmu = require("./public/javascripts/GoogleMapUtils"),
	hmu = require("./public/javascripts/HeatMapUtils"),
	Db = require('mongodb').Db,
	Connection = require('mongodb').Connection,
	Server = require('mongodb').Server,
	BSON = require('mongodb').BSONNative;

zeromq_conf = yaml.eval(fs.readFileSync(__dirname+'/config/zeromq.yml').toString());
tiledaemon_conf = yaml.eval(fs.readFileSync(__dirname+'/config/tiledamon.yml').toString());
mongo_conf = yaml.eval(fs.readFileSync(__dirname+'/config/mongo.yml').toString());

MOZILLA_LIMIT = 100;
WEBKIT_LIMIT  = 500;

var db = new Db(mongo_conf[os.hostname()].db, new Server(mongo_conf[os.hostname()].host, mongo_conf[os.hostname()].port, {}), {auto_reconnect: true, native_parser:true});

var pointscollection;

db.open(function(err, automatic_connect_client) {
  db.authenticate(mongo_conf[os.hostname()].user, mongo_conf[os.hostname()].pass, function(err, replies) {
	console.log("mongodbdb auth completed");
  	db.collection(mongo_conf[os.hostname()].points_collection, function(err, coll) {
		pointscollection = coll;
	});
  });
});

process.on('exit', function () {
	db.close();
});

var createTile = function(cfg) {
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
    
    console.log("exactsize:"+exactsize);
    
	var extents = GoogleMapUtils.calcExtents(X, Y, Z, exactsize);
	
	var query = {'loc':{'$within':{'$box':[[extents.swlat, extents.swlng],[extents.nelat, extents.nelng]]}}};
	
	if(!pointscollection) {
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
				if(cfg.dataurl) {
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
            
			if(!process_image_data) {
				cfg.sock.send(JSON.stringify({x:X,y:Y,z:Z,"items":heatitems,"numpoints":heatitems.length}));
				return;
			}

			if(cfg.dataurl) {
				canvas.toDataURL('image/png', function(err, str) {
					cfg.sock.send(JSON.stringify({x:X,y:Y,z:Z,"tiledata":str,"numpoints":items.length}));
				});
			}
			
			stream = canvas.createPNGStream();
			var out = fs.createWriteStream(__dirname+'/public/tile/'+X+'-'+Y+'-'+Z+'.png')
			
			stream.on('data', function(chunk){
				out.write(chunk);
			});

			stream.on('end', function(){
				stream.close();
				out.close();
			});
		});
	});
};

s = zmq.createSocket('rep');

s.bind(zeromq_conf.bindto, function(err) {
	//if (err) throw err;
	
    s.on('message', function(data) {
        console.log("got message: "+data);
        
        cfg = JSON.parse(data);
        cfg.sock = s;
        
        createTile(cfg);
    });
    
    console.log('Tile server listening for ZeroMQ messages');
});

module.exports = net.createServer(function(stream){
    stream.addListener('data', function(chunk){
        //stream.write(chunk);
    });
    stream.addListener('end', function(){
        //stream.end();
    });
});
