RaphaelOverlay.prototype = new google.maps.OverlayView();

/** 
 * Draw with raphael library over google map. 
 */ 
function RaphaelOverlay(map) { 
	this.setMap(map);
} 

/** 
 * Convert lan/lng map coordinates to the canvas point coordinates. 
 */ 
RaphaelOverlay.prototype.fromLatLngToCanvasPixel = function(latLng) { 
    var divPixel = this.getProjection().fromLatLngToDivPixel(latLng); 

    var left = this.canvasCenter.x - this.canvasWidth / 2; 
    var top = this.canvasCenter.y - this.canvasHeight / 2; 

    var x = divPixel.x - left; 
    var y = divPixel.y - top; 

    var canvasPixel = new google.maps.Point(x, y); 

    return canvasPixel; 
} 

/** 
 * Convert canvas point coordinates to the lan/lng map coordinates. 
 */ 
RaphaelOverlay.prototype.fromCanvasPixelToLatLng = function(canvasPixel) { 

    // borders of the map 
    var left = this.canvasCenter.x - this.canvasWidth / 2; 
    var top = this.canvasCenter.y - this.canvasHeight / 2; 

    // point coondinates on the canvas layer 
    var x = canvasPixel.x + left; 
    var y = canvasPixel.y + top; 

    var divPixel = new google.maps.Point(x, y); 
    var latLng = this.getProjection().fromDivPixelToLatLng(divPixel); 

    return latLng; 
} 

RaphaelOverlay.prototype.onAdd = function() { 
    // painting for the layer 
    this.div = document.createElement('div'); 
    this.div.id = "raphaeloverlaydiv";
    this.div.style.border = 'none'; 
    this.div.style.position = 'absolute'; 
    this.div.style.overflow = 'visible'; 

    this.getPanes().overlayImage.appendChild(this.div); 
    this.canvas = Raphael(this.div); 
}; 

RaphaelOverlay.prototype.draw = function() { 
    this.canvasCenter = this.getProjection().fromLatLngToDivPixel(this.getMap().getCenter()); 
    this.canvasWidth = Math.min(this.getProjection().getWorldWidth(), 60000); 
    this.canvasHeight = Math.min(this.getProjection().getWorldWidth(), 60000); 

    this.div.style.left = this.canvasCenter.x - this.canvasWidth / 2 + 'px'; 
    this.div.style.top = this.canvasCenter.y - this.canvasHeight / 2 + 'px'; 
    this.div.style.width = this.canvasWidth + 'px'; 
    this.div.style.height = this.canvasHeight + 'px'; 

    this.canvas.setSize(this.canvasWidth, this.canvasHeight);
}; 

RaphaelOverlay.prototype.onRemove = function() { 
    this.div.parentNode.removeChild(this.div); 
}; 
