function RaphaelMapType(cfg) {
	this.tileSize   = {width:256,height:256};
	this.tilepath   = 'tile/';
    
    RaphaelMapType.infowindow = cfg.infowindow;
	if(cfg.size) this.tileSize = cfg.size;
	if(cfg.usesockets) this.usesockets = cfg.usesockets;
	if(cfg.browser) this.browser = cfg.browser;
	if(cfg.tilepath) this.tilepath = cfg.tilepath;
	
    this.socket = new io.Socket(null, {port: 80, rememberTransport: false});
    this.socket.connect();
    this.socket.on('message', this.refreshImageData, this);
}

RaphaelMapType.papers = [];

RaphaelMapType.prototype.refreshImageData = function(obj) {
    obj = JSON.parse(obj);
    
    ele = document.getElementById(obj.x+'-'+obj.y+'-'+obj.z);
    
    if(!ele) return; // Element went away between the time the query was sent and the data was collected.
    
    for(i in obj.items) {
        var point = new GoogleMapUtils.getOffsetPixelCoords(obj.items[i].loc.lat,obj.items[i].loc.lon,obj.z,obj.x,obj.y);
        var circle = RaphaelMapType.papers[ele.id].circle(point.x,point.y,10);
        circle.attr("fill", "#f00");
        circle.attr("stroke", "#fff");
        
        circle.data = obj.items[i];
        
        circle.click(function(event) {
            console.log(this,"clicked");
            $('#pointinfo').html(
                '<span class="sechdr">IPs:</span> '+this.data.ip+'<br />'+
                '<span class="sechdr">Message Average:</span> '+this.data.msgcount).dialog('open');
        }).mouseover(function (event) {
            //console.log(this,"mouseover");
            this.animate({
                'fill':'black',
                'scale':[2.0,2.0]
                },250);
        }).mouseout(function (event) {
            //console.log(this,"mouseout");
            this.animate({
                'fill':'green',
                'scale':[1.0,1.0]
                },250);
        });
    }
};

RaphaelMapType.prototype.getTile = function(coord, zoom, ownerDocument) {
    var ele = document.createElement("div");
    ele.setAttribute("id",coord.x+'-'+coord.y+'-'+zoom);
    
    var paper = Raphael(ele);
    RaphaelMapType.papers[coord.x+'-'+coord.y+'-'+zoom] = paper;

    RaphaelMapType.socket.send({"coord":coord,"zoom":zoom, "browser":this.browser,'process_image_data':false});
    
    return ele;
};

RaphaelMapType.prototype.releaseTile = function(node) {
    delete RaphaelMapType.papers[node.id];
    //console.log(node,"releaseTile");
};
