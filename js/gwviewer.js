/*!
	Gravitational Wave Viewer
	Created by Chris North and Stuart Lowe
	
	Requires stuquery
*/
function GWViewer(attr) {
	
	this.version = "0.1";
	if(!attr) attr = {};
	if(typeof attr.id!=="string") attr.id = "gw-viewer";
	this.attr = attr;


	this.logging = true;
	if(typeof this.attr.log==="boolean") this.logging = this.attr.log;

	function query(){
        var r = {length:0};
        var q = location.search;
		if(q && q != '#'){
			// remove the leading ? and trailing &
			q = q.replace(/^\?/,'').replace(/\&$/,'');
			qs = q.split('&');
			for(var i = 0; i < qs.length; i++){
				var key = qs[i].split('=')[0];
				var val = qs[i].split('=')[1];
				if(/^[0-9.]+$/.test(val)) val = parseFloat(val);	// convert floats
				r[key] = val;
				r['length']++;
			}
		}
		return r;
	}
	this.query = query();

	this.languages = {};
	this.lang = (this.query.lang ? this.query.lang : (navigator) ? (navigator.userLanguage||navigator.systemLanguage||navigator.language||browser.language) : "");

	
	// Create DOM references
	if(!this.attr.dom) this.attr.dom = {};
	this.dom = { };
	for(d in this.attr.dom){ this.dom[d] = this.attr.dom[d]; }

	// Set up the viewer in the DOM
	if(S('#'+attr.id).length == 0) S('body').append('<div id="'+attr.id+'">GW Viewer</div>');
	this.dom.main = S('#'+attr.id);
	if(!this.dom.menu){
		this.dom.main.append('<div id="gw-menu"></div>');
		this.dom.menu = S('#gw-menu');
	}

	// Update DOM
	this.dom.main.html('<div class="viewer"></div>');
	if(this.dom.menu.length == 1) this.dom.menu.html('<div class="menu"><h1><span lang="text.gwviewer.information.title" class="translatable">Gravitational wave viewer</span><span class="version"></span></h1><section id="language" class="collapse"><h2 tabindex="0" class="expandable"><span lang="text.plotgw.lang.title" lang-title="tooltip.plotgw.showlang" class="translatable">Language</span> - <span lang="meta.name" class="translatable">English</span> [<span lang="meta.code" class="translatable">en</span>]</h2><ol id="languagelist" class="expander"></ol></section><section class="collapse"><h2 id="order" lang="text.gwviewer.orderby" class="translatable expandable" tabindex="0">Order by</h2><ol class="expander"><li><button class="order selected translatable" lang="text.gwviewer.orderby.date-oldest" order-by="UTC">Date (oldest first)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.date-newest" order-by="UTC" order-reverse="true">Date (most recent first)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.M1-largest" order-by="M1" order-reverse="true">M1 (largest)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.M2-largest" order-by="M2" order-reverse="true">M2 (largest)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.Mfinal-largest" order-by="Mfinal" order-reverse="true">Final mass (largest)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.dl-furthest" order-by="DL" order-reverse="true">Luminosity distance (furthest)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.dl-nearest" order-by="DL">Luminosity distance (nearest)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.rho-highest" order-by="rho" order-reverse="true">Signal-to-noise (highest)</button></li></ol></section><section id="filter" class="collapse"><h2 tabindex="0" class="expandable"><span lang="text.gwviewer.filter" lang-title="text.gwviewer.filter.title" class="translatable">Filter</span></h2><form class="expander" id="filterform"></form></section></div>');
	S('.version').html(this.version);
	
	this.loadCatalogue();
	this.loadLanguageList();
	
	return this;
}

GWViewer.prototype.addMenu = function(){

	// We might want to add GWCat functions so we can find the ranges from the data
	this.filters = {
		'observingrun': {
			'label': 'text.gwviewer.filter.observingrun',
			'type':'checkbox',
			'options':[
				{'id': 'o1', 'label':'text.gwviewer.filter.observingrun.O1' },
				{'id': 'o2', 'label':'text.gwviewer.filter.observingrun.O2' },
				{'id': 'o3', 'label':'text.gwviewer.filter.observingrun.O3' }
			]
		},
		'detector': {
			'label': 'text.gwviewer.filter.detector',
			'type':'checkbox',
			'options':[
				{'id': 'detector-H', 'label': 'text.gwviewer.filter.detector-H' },
				{'id': 'detector-L', 'label': 'text.gwviewer.filter.detector-L' },
				{'id': 'detector-V', 'label': 'text.gwviewer.filter.detector-V' }
			]
		},
		'object': {
			'label': 'text.gwviewer.filter.object',
			'type':'checkbox',
			'options':[
				{'id': 'object-BBH', 'label':'text.gwviewer.filter.object.BBH' },
				{'id': 'object-BNS', 'label':'text.gwviewer.filter.object.BNS' }
			]
		},
		'M1': {
			'label': 'data.M1.name',
			'type':'slider',
			'min': { 'label': '', 'unit': 'data.M1.unit', 'default': 0, 'value': 0 },
			'max': { 'label': '', 'unit': 'data.M1.unit', 'default': 50, 'value': 50 }
		},
		'M2': {
			'label': 'data.M2.name',
			'type':'slider',
			'min': { 'label': '', 'unit': 'data.M2.unit', 'default': 0, 'value': 0 },
			'max': { 'label': '', 'unit': 'data.M2.unit', 'default': 50, 'value': 50 }
		},
		'Mfinal': {
			'label': 'data.Mfinal.name',
			'type':'slider',
			'min': { 'label': '', 'unit': 'data.Mfinal.unit', 'default': 0, 'value': 0 },
			'max': { 'label': '', 'unit': 'data.Mfinal.unit', 'default': 100, 'value': 100 }
		},
		'rho': {
			'label': 'data.rho.name',
			'type':'slider',
			'min': { 'label': '', 'default': 0, 'value': 0 },
			'max': { 'label': '', 'default': 40, 'value': 40 }
		},
		'skyArea': {
			'label': 'data.skyArea.name',
			'type':'slider',
			'min': { 'label': '', 'unit': 'data.skyArea.unit', 'default': 0, 'value': 0 },
			'max': { 'label': '', 'unit': 'data.skyArea.unit', 'default': 1000, 'value': 1000 }
		},
		'DL': {
			'label': 'data.DL.name',
			'type':'slider',
			'min': { 'label': '', 'unit': 'data.DL.unit', 'default': 0, 'value': 0 },
			'max': { 'label': '', 'unit': 'data.DL.unit', 'default': 3000, 'value': 3000 }
		},
		'z': {
			'label': 'data.z.name',
			'type':'slider',
			'step': 0.01,
			'min': { 'label': '', 'default': 0, 'value': 0 },
			'max': { 'label': '', 'default': 0.3, 'value': 0.3 }
		},
		'date': {
			'label': 'data.date.name',
			'type':'slider',
			'format': 'date',
			'step': 7 * 24 * 60 * 60 * 1000,
			'min': { 'label': '' },
			'max': { 'label': '' }
		}
	}
	
	var __obj = this;
	function getDateRange(){
		var min = new Date();
		var max = new Date('2000');
		for(var i = 0; i < __obj.cat.data.length; i++){
			d = new Date(__obj.cat.data[i].UTC.best);
			if(d < min) min = d;
			if(d > max) max = d;
		}
		return [min,max];
	}

	function makeSlider(key){
		var a = __obj.filters[key];
		this.el = S('#'+key);
		this.range = {};
		this.values = [0,0];
		var dates;
		if(typeof a.min['default']==="number") this.range.min = a.min['default'];
		else{
			if(a.format=='date'){
				if(!dates) dates = getDateRange();
				this.range.min = (dates[0]).getTime();
			}
		}
		if(typeof a.max['default']==="number") this.range.max = a.max['default'];
		else{
			if(a.format=='date'){
				if(!dates) dates = getDateRange();
				this.range.max = (dates[1]).getTime();
			}
		}
		// Set the starting values to either a specified value or the range default
		this.values[0] = (typeof a.min.value==="number" ? a.min.value : this.range.min);
		this.values[1] = (typeof a.max.value==="number" ? a.max.value : this.range.max);
		
		
		this.step = (a.step||1);
		inputs = { 'start': this.values, 'step': this.step, 'range': this.range, 'connect': true };
		this.slider = noUiSlider.create(this.el.find('.slider')[0], inputs);
		var _obj = this;
		this.slider.on('update', function(values, handle) {
			var value = values[handle];
			_obj.values[handle] = parseFloat(value);
			var min = _obj.values[0];
			var max = _obj.values[1];
			if(a.format=='date'){
				min = (new Date(min)).toISOString().substr(0,10);
				max = (new Date(max)).toISOString().substr(0,10);
			}
			if(_obj.el.find('.min').length > 0) _obj.el.find('.min').html(min);
			if(_obj.el.find('.max').length > 0) _obj.el.find('.max').html(max);
		});
		return this;
	}

	for(key in this.filters){
		a = this.filters[key]
		form = '';
		form += '<h3 lang="'+a.label+'" class="translatable"></h3><ol>';
		if(a.type == "slider"){
			form += '<li class="row range"><div id="'+key+'"><div class="slider"></div><span class="min">'+a.min['default']+'</span> &rarr; <span class="max"></span>'+(a.max.unit ? '<span lang="'+a.max.unit+'" class="translatable"></span>':'')+'</div></li>';
		}else if(a.type == "checkbox"){
			for(var i = 0; i < a.options.length; i++) form += '<li class="row"><input type="checkbox" name="'+a.options[i].id+'" id="'+a.options[i].id+'" checked="checked"></input><label for="'+a.options[i].id+'" lang="'+a.options[i].label+'" class="translatable"></label></li>';
		}
		form += '</ol>';
		S('#filterform').append(form);
		if(this.filters[key].type == "slider"){
			this.filters[key].slider = new makeSlider(key);
		}
	}
	// this.filters[key].slider.set([10,30]);

	// Add event to expandable lists
	this.dom.menu.find('.expandable').on('click',{gw:this},function(e){
		var section = S(e.currentTarget).parent();
		console.log(e.currentTarget.nextSibling);
		section.toggleClass('collapse');
		var growDiv = e.currentTarget.nextSibling;
		if(growDiv.clientHeight) {
			growDiv.style.height = 0;
		}else{
			growDiv.style.height = growDiv.scrollHeight + "px";
		}
	});

	// Add events to order buttons
	S('button.order').on('click',{gw:this},function(e){
		button = S(e.currentTarget);
		by = button.attr('order-by');
		rev = (button.attr('order-reverse') ? true : false);
		S('button.order.selected').removeClass('selected');
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

	return this;
}

GWViewer.prototype.log = function(){
	if(this.logging){
		var args = Array.prototype.slice.call(arguments, 0);
		if(console && typeof console.log==="function") console.log('GWViewer',args);
	}
	return this;
}

// Get the list of languages
GWViewer.prototype.loadLanguageList = function(file){

	this.log('loadLanguageList')
	if(!file || typeof file!=="string") file = 'lang/lang.json';

	S().ajax(file,{
		'dataType': 'json',
		'this':this,
		'success': function(data,attrs){
			this.log('Loaded language list');
			this.languages = data;
			html = "";
			for(var l in this.languages) html += '<li><button id="lang-'+l+'" lang="'+l+'" tabindex="0">'+this.languages[l].name+'</button></li>';
			S('#languagelist').html(html);

			// Add events to buttons
			S('#languagelist button').on('click',{me:this},function(e){
				el = S(e.currentTarget);
				l = el.attr('lang');
				if(l) e.data.me.loadLanguage(l);
			});			

			this.loadLanguage();
		}
	});
	return this;
}

GWViewer.prototype.loadLanguage = function(l){

	this.log('loadLanguage');

	// If no user-provided language then use the system default
	if(!l) l = this.lang;
	
	// Is the language in our list of known languages?
	if(!this.languages[l]){
		l = (l.indexOf('-') > 0 ? l.substring(0,l.indexOf('-')) : l.substring(0,2));
		// Is a short code version of the language in our list of languages
		if(!this.languages[l]){
			// We don't seem to have this language so use English
			l = "en";
		}
	}
	this.lang = l;
	S('#languagelist button.selected').removeClass('selected')
	S('#lang-'+this.lang).addClass('selected');

	this.log('loading',l);
	if(!this.languages[l].dict){
		this.languages[l].dict = {};
		var _filestoload = this.languages[l].files.length;
		var _filesloaded = 0;
		for(var f = 0; f < this.languages[l].files.length; f++){
			console.log(this.languages[l].files[f])
			S().ajax(this.languages[l].files[f],{
				'dataType': 'json',
				'this':this,
				'success': function(data,attrs){
					this.log('complete language load',data,attrs.url);
					// Overwrite/update dictionary
					for (var attrname in data) { this.languages[l].dict[attrname] = data[attrname]; }
					_filesloaded++;
					if(_filestoload == _filesloaded) this.updateLanguage();
				}
			})
		}
	}else this.updateLanguage();

	return this;
}

// Update the interface
GWViewer.prototype.updateLanguage = function(){
	this.log('updateLanguage',this.lang);

	this.language = this.languages[this.lang].dict;
	
	// Now update any elements that need updating
	var e = S('.translatable');
	for(var i = 0; i < e.length; i++){
		el = S(e[i]);
		text = el.attr('lang');
		title = el.attr('lang-title');
		if(this.language[text]) text = this.language[text];
		if(this.language[title]) title = this.language[title];
		el.html(text).attr('title',title);
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
		_obj.addMenu();
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

