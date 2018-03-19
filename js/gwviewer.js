/*!
	Gravitational Wave Viewer
	Created by Chris North and Stuart Lowe
	
	Requires stuquery
*/
function GWViewer(attr) {
	
	if(!attr) attr = {};
	if(typeof attr.id!=="string") attr.id = "gw-viewer";
	this.attr = attr;
	
	// Set up the viewer in the DOM
	if(S('#'+attr.id).length == 0) S('body').append('<div id="'+attr.id+'">GW Viewer</div>');
	var el = S('#'+attr.id);

	el.html('<div class="header">GW Viewer</div><div class="viewer"></div><div class="menu">Order by: <button class="order selected" order-by="UTC">Date (oldest first)</button><button class="order" order-by="UTC" order-reverse="true">Date (most recent first)</button><button class="order" order-by="M1" order-reverse="true">M1 (largest)</button><button class="order" order-by="M2" order-reverse="true">M2 (largest)</button><button class="order" order-by="Mfinal" order-reverse="true">Final mass (largest)</button><button class="order" order-by="DL" order-reverse="true">Luminosity distance (furthest)</button><button class="order" order-by="DL">Luminosity distance (nearest)</button><button class="order" order-by="rho" order-reverse="true">Signal-to-noise (highest)</button></div>');

	// Add events to order buttons
	el.find('button.order').on('click',{gw:this},function(e){
		button = S(e.currentTarget);
		by = button.attr('order-by');
		rev = (button.attr('order-reverse') ? true : false);
		el.find('button.selected').removeClass('selected');
		button.addClass('selected');

		e.data.gw.cat.orderData(by,rev);
		e.data.gw.renderCatalogue();
	});

	var _obj = this;

	this.cat = new GWCat(function(){ _obj.loadCatalogue(); },{'fileIn':'gwcat/data/events.json'});
	

	return this;
}

GWViewer.prototype.loadCatalogue = function(){
	// Order the data by time (default)
	this.cat.orderData('UTC');

	this.renderCatalogue();

	return this;
}

GWViewer.prototype.renderCatalogue = function(){

	function makeCircle(m,u){
		var r = 3;
		var v = "?";
		if(typeof m==="number"){
			r = Math.sqrt(m*0.5).toFixed(2);
			v = m;
		}
		return '<div style="position:relative;display:inline-block;border-radius:100%;width:'+r+'em;height:'+r+'em;background-color:'+(v=="?" ? 'rgba(255,255,255,0.5)' : 'white')+';color:black;vertical-align:middle;text-align:center;"><div style="position:absolute;left:50%;top:50%;transform:translate3d(-50%,-50%, 0);">'+v+'</div></div>';
	}

	str = "<ol>";
	for(var i = 0; i < this.cat.length; i++){
		name = this.cat.data[i].name;
		var m = [{'v':0,'u':''},{'v':0,'u':''},{'v':0,'u':''}];
		str += '<li>'+name+' - '+this.cat.getValue(name,'UTC','best');
		m[1].v = this.cat.getValue(name,'M1','best');
		m[1].u = this.cat.paramUnit("M1").replace(/_sun/,"<sub>&#9737;</sub>");
		m[2].v = this.cat.getValue(name,'M2','best');
		m[2].u = this.cat.paramUnit("M2").replace(/_sun/,"<sub>&#9737;</sub>");
		m[0].v = this.cat.getValue(name,'Mfinal','best');
		m[0].u = this.cat.paramUnit("Mfinal").replace(/_sun/,"<sub>&#9737;</sub>");
		//str += '<br />M<sub>1</sub> mass = '+(typeof m[1].v==="number" ? m[1].v+' '+m[1].u:'');
		//str += '<br />M<sub>2</sub> mass = '+(typeof m[2].v==="number" ? m[2].v+' '+m[2].u:'');
		//str += '<br />Final mass = '+(typeof m[0].v==="number" ? m[0].v+' '+m[0].u:'')
		str += ' (';
		str += 'Signal-to-noise = '+(typeof this.cat.getValue(name,'rho','best')==="number" ? this.cat.getValue(name,'rho','best'):'')+'; ';
		str += 'Luminosity distance = '+(typeof this.cat.getValue(name,'DL','best')==="number" ? this.cat.getValue(name,'DL','best'):'')+' '+this.cat.paramUnit("DL");
		str += ')';
		str += '<br />';
		str += makeCircle(m[1].v,m[1].u);
		str += ' + ';
		str += makeCircle(m[2].v,m[2].u);
		str += ' &rarr; ';
		str += makeCircle(m[0].v,m[0].u);
		str += '</li>';
	}
	str += '</ol>';
	S('#'+this.attr.id).find('.viewer').html(str);
	return this;
}