/*!
	Gravitational Wave Viewer
	Created by Chris North and Stuart Lowe
	
	Requires stuquery
*/
function GWViewer(attr) {
	
	if(!attr) attr = {};
	if(typeof attr.id!=="string") attr.id = "gw-viewer";
	this.attr = attr;
	this.logging = false;
	if(typeof this.attr.log==="boolean") this.logging = this.attr.log;
	
	// Set up the viewer in the DOM
	if(S('#'+attr.id).length == 0) S('body').append('<div id="'+attr.id+'">GW Viewer</div>');
	var el = S('#'+attr.id);

	el.html('<div class="header"></div><div class="menu">Order by: <button class="order selected" order-by="UTC">Date (oldest first)</button><button class="order" order-by="UTC" order-reverse="true">Date (most recent first)</button><button class="order" order-by="M1" order-reverse="true">M1 (largest)</button><button class="order" order-by="M2" order-reverse="true">M2 (largest)</button><button class="order" order-by="Mfinal" order-reverse="true">Final mass (largest)</button><button class="order" order-by="DL" order-reverse="true">Luminosity distance (furthest)</button><button class="order" order-by="DL">Luminosity distance (nearest)</button><button class="order" order-by="rho" order-reverse="true">Signal-to-noise (highest)</button></div><div class="viewer"></div>');

	// Add events to order buttons
	el.find('button.order').on('click',{gw:this},function(e){
		button = S(e.currentTarget);
		by = button.attr('order-by');
		rev = (button.attr('order-reverse') ? true : false);
		el.find('button.selected').removeClass('selected');
		button.addClass('selected');

		e.data.gw.cat.orderData(by,rev);

		var container = S('#'+e.data.gw.attr.id).find('.viewer ol')[0];
		var tmp = document.createElement('ol');
		console.log(e.data.gw.cat.dataOrder)
		for(var i = 0; i < e.data.gw.cat.dataOrder.length; i++){
			console.log(e.data.gw.cat.dataOrder[i],S('#'+e.data.gw.cat.dataOrder[i]),document.getElementById('#' + e.data.gw.cat.dataOrder[i]))
			tmp.appendChild( S('#'+e.data.gw.cat.dataOrder[i])[0] );
		}
		container.parentNode.replaceChild(tmp, container);
	});

	this.loadCatalogue();
	
	return this;
}

GWViewer.prototype.log = function(){
	if(this.logging){
		var args = Array.prototype.slice.call(arguments, 0);
		if(console && typeof console.log==="function") console.log('GWViewer',args);
	}
	return this;
}

GWViewer.prototype.loadCatalogue = function(file){

	this.log('loadCatalogue')
	if(!file || typeof file!=="string") file = 'gwcat/data/events.json';
	var _obj = this;
	function loaded(){
		_obj.log('loaded catalogue from '+file);

		// Order the data by time (default)
		_obj.cat.orderData('UTC');
		_obj.loadWaves();
		_obj.renderCatalogue();
	}
	this.cat = new GWCat(loaded,{'fileIn':file});

	return this;
}

GWViewer.prototype.loadWaves = function(){

	// Load each wave
	// Dummy lookup table for files
	var wavefiles = {
		'GW150914':{'file':'example-data/m1-5-m2-5.txt','offset':-4.233642578,'colour':'#1576a1'},
		'LVT151012':{'file':'example-data/m1-5-m2-10.txt','offset':-2.905273438,'colour':'#0a9676'},
		'GW151226':{'file':'example-data/m1-10-m2-10.txt','offset':-1.933959961,'colour':'#c85b26'},
		'GW170104':{'file':'example-data/m1-10-m2-15.txt','offset':-1.654052734,'colour':'#c288a5'},
		'GW170608':{'file':'example-data/m1-15-m2-20.txt','offset':-1.3227539},
		'GW170814':{'file':'example-data/m1-30-m2-30.txt','offset':-1.388305664,'colour':'#eeea87'},
	};
	
	var _obj = this;
	for(var i = 0; i < this.cat.length; i++){
		if(!this.cat.data[i].waveform){
			console.log(this.cat.data[i].name)
			if(!wavefiles[this.cat.data[i].name]) wavefiles[this.cat.data[i].name] = {};
			wavefiles[this.cat.data[i].name].callback = {
				'onload': function(a){
					_obj.scaleWaves();
				},
				'onprogress': function(a){
					this.draw();
				}
			}
			wavefiles[this.cat.data[i].name].wide = 2000;
			wavefiles[this.cat.data[i].name].tall = 100;
			this.cat.data[i].waveform = new WaveForm(wavefiles[this.cat.data[i].name]);
			this.cat.data[i].waveform.name = this.cat.data[i].name;
			this.cat.data[i].waveform.setAxis('x',5000);
			this.log('get data',i,this.cat.data[i]);
			if(this.cat.data[i].waveform.file) this.cat.data[i].waveform.loadData();
		}
	}
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

	// Build the list of gravitational waves
	var viewer = S('#'+this.attr.id).find('.viewer');
	viewer.html('<div class="waves"><ol></ol></div>');

	this.log('renderCatalogue');

	for(var i = 0; i < this.cat.length; i++){
		name = this.cat.data[i].name;
		var m = [{'v':0,'u':''},{'v':0,'u':''},{'v':0,'u':''}];

		// Create a DOM element for this catalogue item
		var el = document.createElement("li");

		// Add the DOM element to the list
		viewer.find('ol')[0].appendChild(el);

		// Turn the element into a stuQuery object
		this.cat.data[i].waveform.el = S(el);

		// Add the gravitational wave name as the DOM element ID
		this.cat.data[i].waveform.el.attr('id',name);

		// Build the HTML for the DOM element
		str = name+' - '+this.cat.getValue(name,'UTC','best');
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

		// Add the HTML to the element
		this.cat.data[i].waveform.el.html('<div class="gw-about">'+str+'</div><div class="waveform">Waveform</div>');
	}
	
	return this;
}

GWViewer.prototype.scaleWaves = function(){
	this.log('scaleWaves')
	var max = 0;
	for(var i = 0; i < this.cat.length; i++){
		if(this.cat.data[i].waveform.max > max) max = this.cat.data[i].waveform.max;
	}
	for(var i = 0; i < this.cat.length; i++){
		if(max > 0) this.cat.data[i].waveform.axes.y = max;
		this.cat.data[i].waveform.draw();
	}
	return this;
}

// Object to process wave forms
function WaveForm(attr){
	if(!attr) attr = {};
	for(var a in attr) this[a] = attr[a];

	this.loaded = false;
	this.loading = false;
	if(typeof this.logging==="undefined") this.logging = false;
	this.excanvas = (typeof G_vmlCanvasManager != 'undefined') ? true : false;
	this.axes = {'x':2000,'y':2e6};

	return this;
}
WaveForm.prototype.log = function(){
	if(this.logging){
		var args = Array.prototype.slice.call(arguments, 0);
		if(console && typeof console.log==="function") console.log('WaveForm',args);
	}
	return this;
}
WaveForm.prototype.addData = function(data){
	this.loading = true;
	this.datastr = data;
	return this;
}
WaveForm.prototype.endData = function(data){
	this.loading = false;
	this.loaded = true;
	this.datastr = data;
	return this;
}
WaveForm.prototype.loadData = function(){
	if(!this.file){
		console.log('No file provided to load from');
		return this;
	}
	S().ajax(this.file,{
		'dataType': 'text',
		'this':this,
		'success': function(data,attrs){
			this.log('complete',attrs,this);
			this.endData(data);
			if(typeof this.callback.onload==="function") this.callback.onload.call(this);
//			this.draw();
		},
		'progress': function(e,attrs){
			this.log('progress',attrs,this);
			this.addData(e.target.responseText);
			if(typeof this.callback.onprogress==="function") this.callback.onprogress.call(this);
//			this.draw();
		}
	});
	return this;
}

WaveForm.prototype.parse = function(){
	this.log('parse',this);
	var xscale = 1000;	// into milliseconds
	var yscale = 1e24;

//strain * 1e23

	if(!this.datastr) return this;
	// Parse the data string
	var d = this.datastr;
	d = d.substr(0,d.lastIndexOf('\n'));
	d = d.split('\n');
	this.data = new Array(d.length-1);
	var ids = d[0].replace(/^# /,'').split(/ /);
	var idx = {};
	var scaling = 1;
	for(var j = 0; j < ids.length; j++) idx[ids[j]] = j;
	if(typeof idx.t==="undefined") return this;
	if(typeof idx.hp==="undefined"){
		if(typeof idx['strain*1e23']==="number"){
			idx.hp = idx['strain*1e23'];
			scaling = 1e-23;
		}else return this;
	}
	this.max = -1e12;
	var v;
	for(var row = 1; row < d.length; row++){
		if(d[row]){
			cols = d[row].split(/ /);
			this.data[row-1] = {'t':parseFloat(cols[idx.t]-this.offset)*xscale,'hp':parseFloat(cols[idx.hp])*yscale*scaling};
			// Find the maximum amplitude
			v = Math.abs(this.data[row-1].hp); 
			if(v > this.max) this.max = v;
		}
	}
	this.max *= 2;

	return this;
}

WaveForm.prototype.setAxis = function(t,size){
	this.axes[t] = size;
	return this;
}

// Render a gravitational wave
// Input can be either an index (integer) or a gravitational wave ID e.g. 'GW150914'
WaveForm.prototype.draw = function(){
	
	this.log('draw',this);
	if(!this.el) return this;

	var el = this.el.find('.waveform');
	if(el.length<1) return this;
	
	var id = this.name+'-canvas';
	el.attr('id',id);
	var idinner = id+'_inner';

	if(typeof this.canvas==="undefined" || S('#'+idinner).length == 0){
		el.html('');
		var canvas = document.createElement("canvas");
		el[0].appendChild(canvas);
		S(canvas).attr('id',idinner).css({'display':'block'});

		this.c = canvas;
		this.canvas = S(canvas);

		// For excanvas we need to initialise the newly created <canvas>
		if(this.excanvas) this.c = G_vmlCanvasManager.initElement(this.c);

		// If the Javascript function has been passed a width/height
		// those take precedence over the CSS-set values
		console.log(this.wide,this.tall,typeof this.wide,typeof this.tall)
		if(typeof this.wide!=="number") this.wide = this.el[0].offsetWidth;
		if(typeof this.tall!=="number") this.tall = this.el[0].offsetHeight;

		if(this.c && this.c.getContext){  
		
			this.setWH(this.wide,this.tall);
			this.ctx = this.c.getContext('2d');
			this.ctx.clearRect(0,0,this.wide,this.tall);
			this.ctx.beginPath();
			var fs = this.getFontsize();
			this.ctx.font = fs+"px Helvetica";
			this.ctx.fillStyle = 'rgb(255,255,255)';
			this.ctx.lineWidth = 1.5;
			var loading = 'Loading waveform...';
			this.ctx.fillText(loading,(this.wide-this.ctx.measureText(loading).width)/2,(this.tall-fs)/2)
			this.ctx.fill();
		}
	}

	this.parse();
	
	if(this.ctx){

		this.ctx.moveTo(0,0);

		this.ctx.clearRect(0,0,this.wide,this.tall);
		this.ctx.beginPath();

		colour = this.colour || 'white';
		this.ctx.strokeStyle = colour;
		this.ctx.fillStyle = colour;
		this.ctx.lineWidth = 1;

		xscale = this.wide/this.axes.x;
		yscale = this.tall/(typeof this.axes.y==="number" ? this.axes.y : (this.max || 2e6));
		/*
		this.cat.data[i].waveform.svg = new SVG(id);
		this.cat.data[i].waveform.svg.paper.attr('viewBox','0 0 '+xscale+' '+yscale);
		this.cat.data[i].waveform.svg.clear();
	
		// Build path
		// Move to start
		path = [['M',[0,(yscale/2)]]];
		*/
		if(this.data){
			for(var j = 1; j < this.data.length; j++){
				posa = {'x':(this.data[j-1].t*xscale).toFixed(1),'y':((this.tall/2)+Math.round(this.data[j-1].hp*yscale)).toFixed(1)};
				posb = {'x':(this.data[j].t*xscale).toFixed(1),'y':((this.tall/2)+Math.round(this.data[j].hp*yscale)).toFixed(1)};
				this.ctx.moveTo(posa.x,posa.y);
				this.ctx.lineTo(posb.x,posb.y);
				//path.push(['L',[this.cat.data[i].waveform.data[j].t.toFixed(3),(yscale/2)+Math.round(this.cat.data[i].waveform.data[j].hp)]]);
			}
		}
	/*	
		this.cat.data[i].waveform.svg.path(path).attr({'stroke':'red','stroke-width':1});
		this.cat.data[i].waveform.svg.draw();
	*/
		this.ctx.stroke();
	}

	this.log('end draw',this,el);

	return this;
}
WaveForm.prototype.setWH = function(w,h){
	if(!w || !h) return;
	this.c.width = w;
	this.c.height = h;
	this.wide = w;
	this.tall = h;
	this.canvas.css({'width':w+'px','height':h+'px'});
	return this;
}
WaveForm.prototype.getFontsize = function(){
	if(this.fontsize) return parseInt(this.fontsize);
	var m = this.wide;
	//console.log(m,parseInt(this.el.css('font-size')))
	return (m < 600) ? ((m < 500) ? ((m < 350) ? ((m < 300) ? ((m < 250) ? 9 : 10) : 11) : 12) : 14) : parseInt(this.el.css('font-size'));
}

