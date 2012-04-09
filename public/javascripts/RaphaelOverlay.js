RaphaelOverlay.prototype = new google.maps.OverlayView();

function RaphaelOverlay(map) {
    this.map_ = map;
    
    RaphaelOverlay.div_ = null;

    RaphaelOverlay.paper_ = null;

    this.setMap(map);
    
    this.setupSockets();
}

RaphaelOverlay.prototype.setupSockets = function() {
    RaphaelOverlay.socket = new io.Socket(null, {port: 80, rememberTransport: false});
    RaphaelOverlay.socket.connect();
    RaphaelOverlay.socket.on('message', this.drawDots, this);
}

RaphaelOverlay.dot_click = function(event) {
	$('#pointinfo').html(
		'<span class="sechdr">Title:</span> '+this.data.Title+'<br />'+
		'<span class="sechdr">Address:</span> '+this.data.Address+'<br />'+
		'<span class="sechdr">City:</span> '+this.data.City+'<br />'+
		'<span class="sechdr">State:</span> '+this.data.State+'<br />'+
		'<span class="sechdr">Lat/Long:</span> '+this.data.loc.lat+'/'+this.data.loc.lon                
		).dialog('open');
}; 

RaphaelOverlay.dot_mouseover = function (event) {
	this.stop().animate({
		'fill':'#0f0',
		'scale':[20.0,20.0]
		},750,'bounce');
}

RaphaelOverlay.dot_mouseout = function (event) {
	this.stop().animate({
		'fill':'#00f',
		'scale':[10.0,10.0]
		},500,'<');
}

RaphaelOverlay.prototype.drawDots = function(obj) {
	console.log(obj,"drawDots");
	
	if(!obj || !obj.items || obj.items.length < 1 || !obj.items[0].loc.lat) return;
	
    RaphaelOverlay.totaldots += obj.items.length;
    
	zoom = googleMap.getZoom();
	
	for(i=0; i < obj.items.length; i++) {
        var latLng = new google.maps.LatLng(obj.items[i].loc.lat,obj.items[i].loc.lon);
        
/*      
        var center = raphaelOverlay.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(0,0));
        var worldWidth = raphaelOverlay.getProjection().getWorldWidth();
        
        var xy = googleMap.getProjection().fromLatLngToPoint(latLng);
        var ratio = Math.pow(2,googleMap.getZoom());
        
        var point = GoogleMapUtils.getPixelCoords(obj.items[i].loc.lat,obj.items[i].loc.lon,zoom);
*/
        var point = RaphaelOverlay.projection.fromLatLngToDivPixel(latLng);
        
        //console.log("drawing point", point, latLng, obj.items[i].loc);
        
        var circle = RaphaelOverlay.paper_
			.circle(point.x,point.y,1)
			.animate({
				"scale":[10,10],
				"fill": "#00f"
			},1000,'<>')
			.click(RaphaelOverlay.dot_click)
			.mouseover(RaphaelOverlay.dot_mouseover)
			.mouseout(RaphaelOverlay.dot_mouseout);
        
        circle.data = obj.items[i];
	}
}
 
RaphaelOverlay.prototype.onAdd = function() {
	console.log('raphaeloverlay onAdd');
	
    RaphaelOverlay.projection = this.getProjection();
    var center = RaphaelOverlay.projection.fromLatLngToDivPixel(new google.maps.LatLng(0,0)),
		worldWidth = RaphaelOverlay.projection.getWorldWidth();

    // Create the DIV and set some basic attributes.
    RaphaelOverlay.div_ = document.createElement('DIV');
    RaphaelOverlay.div_.id="raphaeloverlay";
    RaphaelOverlay.div_.style.border = "solid";
    RaphaelOverlay.div_.style.borderWidth = "1px";
    
    RaphaelOverlay.div_.style.position = "absolute";
    RaphaelOverlay.div_.style.overflow = 'visible';
    
    //RaphaelOverlay.div_.style.left = center.x - worldWidth / 2 + 'px';
	//RaphaelOverlay.div_.style.top = center.y - worldWidth / 2 + 'px';
	//RaphaelOverlay.div_.style.left = '0px';
	//RaphaelOverlay.div_.style.top = '0px';
	
	RaphaelOverlay.div_.style.width = worldWidth+'px';
	RaphaelOverlay.div_.style.height = worldWidth+'px';
    
	this.getPanes().overlayImage.appendChild(RaphaelOverlay.div_);
    
    // Set the overlay's div_ property to this DIV
    
	RaphaelOverlay.paper_ = Raphael(RaphaelOverlay.div_);
    
    //var panes = this.getPanes();
    //panes.overlayImage.appendChild(this.div_);
}

RaphaelOverlay.prototype.draw = function() {
	worldWidth = RaphaelOverlay.projection.getWorldWidth();
	
    // Create the DIV and set some basic attributes.
    RaphaelOverlay.div_ = document.createElement('DIV');
    //RaphaelOverlay.div_.id="raphaeloverlay";
    RaphaelOverlay.div_.style.border = "solid";
    RaphaelOverlay.div_.style.borderWidth = "1px";
    
    RaphaelOverlay.div_.style.position = "absolute";
    RaphaelOverlay.div_.style.overflow = 'visible';
    
    //RaphaelOverlay.div_.style.left = center.x - worldWidth / 2 + 'px';
	//RaphaelOverlay.div_.style.top = center.y - worldWidth / 2 + 'px';
	//RaphaelOverlay.div_.style.left = '0px';
	//RaphaelOverlay.div_.style.top = '0px';
	
	RaphaelOverlay.div_.style.width = worldWidth+'px';
	RaphaelOverlay.div_.style.height = worldWidth+'px';
    
	this.getPanes().overlayImage.appendChild(RaphaelOverlay.div_);

	RaphaelOverlay.paper_ = Raphael(RaphaelOverlay.div_);

    console.log('draw');
    
    RaphaelOverlay.socket.send({"bounds":this.map_.getBounds(), "zoom":this.map_.getZoom(),"browser":$.browser});

    var position = RaphaelOverlay.projection.fromLatLngToDivPixel(this.getMap().getCenter());
    
    //console.log(position,"position");
    
    var circle = RaphaelOverlay
		.paper_
		.circle(position.x,position.y,1)
		.animate({
			"scale":[10,10],
			"fill": "#00f"
		},3000,'<>')
		.click(function(event) {
			$('#pointinfo').html(
			'<span class="sechdr">Created By:</span> <a href="http://reasontostand.org">Wes Widner</a><br />'
			).dialog('open');
		})
		.mouseover(RaphaelOverlay.dot_mouseover)
		.mouseout(RaphaelOverlay.dot_mouseout);
    /*
    // Retrieve the southwest and northeast coordinates of this overlay
    // in latlngs and convert them to pixels coordinates.
    // We'll use these coordinates to resize the DIV.
    var sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
    var ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());

    // Resize the image's DIV to fit the indicated dimensions.
    var div = this.div_;
    div.style.left = sw.x + 'px';
    div.style.top = ne.y + 'px';
    div.style.width = (ne.x - sw.x) + 'px';
    div.style.height = (sw.y - ne.y) + 'px';
    */
}

RaphaelOverlay.prototype.onRemove = function() {
    RaphaelOverlay.div_.parentNode.removeChild(RaphaelOverlay.div_);
}

// Note that the visibility property must be a string enclosed in quotes
RaphaelOverlay.prototype.hide = function() {
    if (RaphaelOverlay.div_) {
        RaphaelOverlay.div_.style.visibility = "hidden";
    }
}

RaphaelOverlay.prototype.show = function() {
    if (RaphaelOverlay.div_) {
        RaphaelOverlay.div_.style.visibility = "visible";
    }
}

RaphaelOverlay.prototype.toggle = function() {
    if (RaphaelOverlay.div_) {
      if (RaphaelOverlay.div_.style.visibility == "hidden") {
        this.show();
      } else {
        this.hide();
      }
    }
}

RaphaelOverlay.prototype.toggleDOM = function() {
    if (this.getMap()) {
      this.setMap(null);
    } else {
      this.setMap(this.map_);
    }
}
