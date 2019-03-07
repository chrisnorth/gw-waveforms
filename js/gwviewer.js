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
	this.logtime = true;
	if(typeof this.attr.log==="boolean") this.logging = this.attr.log;
	if(typeof this.attr.logtime==="boolean") this.logtime = this.attr.logtime;
	if(this.logging && console) console.log('%cGWViewer v'+this.version+'%c','font-weight:bold;font-size:1.25em;','');
	this.metrics = {};	// Store information about processing times

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

	var _obj = this;
	// We'll need to change the sizes when the window changes size
	window.addEventListener('resize',function(e){ _obj.resize(); });

	this.languages = {};
	this.lang = (this.query.lang ? this.query.lang : (navigator) ? (navigator.userLanguage||navigator.systemLanguage||navigator.language||browser.language) : "");

	// Define the two axes
	this.axes = {
		'x':{
			'scale':2200,
			'offset': 0,
			'logoffset': {
				'value' : -2,
				'range' : {
					'min': -5,
					'max': 2
				}
			},
			'ticks': {
				'value' : 1000,
				'range': {
					'min': 0.1,
					'10%': 0.2,
					'20%': 0.25,
					'30%': 0.5,
					'40%': 1,
					'50%': 2,
					'60%': 5,
					'70%': 10,
					'80%': 20,
					'90%': 50,
					'max': 100
				}
			},
			'logscale': false,
			'gridlines': (typeof this.query.gridlines==="boolean" ? this.query.gridlines : true)
		},
		'y':{
			'auto':true,
			'scale':2e6,
			'spacing':50
		}
	}

	// Define the options
	this.option = { 'lineWidth': {'value':1,'range':{'min':0.2,'max':5}, 'step': 0.2 } };

	// Define colours (empty uses defaults)
	this.colourschemes = {
		'default': {
			'background': '',
			'gridline': '',
			'gridlinelabel': '',
			'waveform': '',
			'waveformlabel': ''
		},
		'bw': {
			'background': 'white',
			'gridline': 'rgba(0,0,0,0.3)',
			'gridlinelabel': 'rgb(0,0,0)',
			'waveform': 'rgb(0,0,0)',
			'waveformlabel': 'rgb(0,0,0)'
		},
		'wb': {
			'background': 'black',
			'gridline': 'rgba(255,255,255,0.3)',
			'gridlinelabel': 'rgb(255,255,255)',
			'waveform': 'rgb(255,255,255)',
			'waveformlabel': 'rgb(255,255,255)'
		}
	};
	this.colourscheme = 'default';

	this.labelpositions = {'hidden':{},'startmerger':{},'endmerger':{},'auto':{}};
	this.labelposition = 'auto';


	// Create DOM references
	if(!this.attr.dom) this.attr.dom = {};
	this.dom = { };
	for(d in this.attr.dom){ this.dom[d] = this.attr.dom[d]; }

	// Set up the viewer in the DOM
	if(S('#'+attr.id).length == 0) S('body').append('<div id="'+attr.id+'">GW Viewer</div>');
	this.dom.main = S('#'+attr.id);

	// Update DOM
	if(this.dom.menu){
		html = '<div class="menu">';
		html += '<section class="collapse"><h2 tabindex="0" class="expandable"><span lang="text.gen.about" lang-title="text.gen.about" class="translatable">About</span></h2><div class="expander row"><p class="translatable" lang="text.gwviewer.help.about"></p><p class="translatable" lang="text.gwviewer.help.technical"></p></div></section>';
		html += '<section class="collapse"><h2 tabindex="0" class="expandable"><span lang="text.plotgw.lang.title" lang-title="tooltip.plotgw.showlang" class="translatable">Language</span> - <span lang="meta.name" class="translatable">English</span> [<span lang="meta.code" class="translatable">en</span>]</h2><ol id="languagelist" class="expander"></ol></section>';
		html += '<section class="collapse"><h2 tabindex="0" class="translatable expandable" lang="text.gwviewer.orderby">Order by</h2><ol class="expander"><li><button class="order selected translatable" lang="text.gwviewer.orderby.date-oldest" order-by="UTC">Date (oldest first)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.date-newest" order-by="UTC" order-reverse="true">Date (most recent first)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.M1-largest" order-by="M1" order-reverse="true">M1 (largest)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.M2-largest" order-by="M2" order-reverse="true">M2 (largest)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.Mfinal-largest" order-by="Mfinal" order-reverse="true">Final mass (largest)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.dl-furthest" order-by="DL" order-reverse="true">Luminosity distance (furthest)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.dl-nearest" order-by="DL">Luminosity distance (nearest)</button></li><li><button class="order translatable" lang="text.gwviewer.orderby.rho-highest" order-by="rho" order-reverse="true">Signal-to-noise (highest)</button></li></ol></section>';
		html += '<section class="collapse"><h2 tabindex="0" class="expandable"><span lang="text.gwviewer.filter" lang-title="text.gwviewer.filter.title" class="translatable">Filter</span></h2><form class="expander" id="filterform"></form></section>';
		html += '<section class="collapse"><h2 tabindex="0" class="expandable"><span lang="text.gwviewer.viewoptions" lang-title="text.gwviewer.viewoptions" class="translatable">View options</span></h2><form class="expander" id="optionsform"></form></section>';
		html += '<section class="collapse"><h2 tabindex="0" class="expandable"><span lang="text.gwviewer.save" lang-title="text.gwviewer.save" class="translatable">Save</span></h2><ol class="expander" id="saveform"><li><button id="save-svg" lang="text.gwviewer.save.svg" lang-title="text.gwviewer.save.svg" class="translatable">Save as SVG</button></li><li><button id="save-png" lang="text.gwviewer.save.png" lang-title="text.gwviewer.save.png" class="translatable">Save as PNG</button></li></ol></section>';
		html += '</div>';
		this.dom.menu.html(html);
	}
	S('.version').html(this.version);

	this.loadCatalogue();
	this.loadLanguageList();

	return this;
}

GWViewer.prototype.log = function(){
	if(this.logging || arguments[0]=="ERROR"){
		var args = Array.prototype.slice.call(arguments, 0);
		if(console && typeof console.log==="function"){
			if(arguments[0] == "ERROR") console.log('%cERROR%c %cGWViewer%c: '+args[1],'color:white;background-color:#D60303;padding:2px;','','font-weight:bold;','',(args.length > 2 ? args.splice(2):""));
			else if(arguments[0] == "WARNING") console.log('%cWARNING%c %cGWViewer%c: '+args[1],'color:white;background-color:#F9BC26;padding:2px;','','font-weight:bold;','',(args.length > 2 ? args.splice(2):""));
			else console.log('%cGWViewer%c','font-weight:bold;','',args);
		}
	}
	return this;
}

GWViewer.prototype.logTime = function(key){
	if(!this.metrics[key]) this.metrics[key] = {'times':[],'start':''};
	if(!this.metrics[key].start) this.metrics[key].start = new Date();
	else{
		var t,w,v,tot,l,i,ts;
		t = ((new Date())-this.metrics[key].start);
		ts = this.metrics[key].times;
		// Define the weights for each time in the array
		w = [1,0.75,0.55,0.4,0.28,0.18,0.1,0.05,0.002];
		// Add this time to the start of the array
		ts.unshift(t);
		// Remove old times from the end
		if(ts.length > w.length-1) ts = ts.slice(0,w.length);
		// Work out the weighted average
		l = ts.length;
		this.metrics[key].av = 0;
		if(l > 0){
			for(i = 0, v = 0, tot = 0 ; i < l ; i++){
				v += ts[i]*w[i];
				tot += w[i];
			}
			this.metrics[key].av = v/tot;
		}
		this.metrics[key].times = ts.splice(0);
		if(this.logtime) console.log('%cGWViewer%c: '+key+' '+t+'ms ('+this.metrics[key].av.toFixed(1)+'ms av)','font-weight:bold;','');
		delete this.metrics[key].start;
	}
	return this;
};

GWViewer.prototype.resize = function(){
	this.log('resize');
	this.canvas = null;
	this.draw();
	return this;
}

GWViewer.prototype.updateFilters = function(){

	this.log('updateFilters');

	// Parse the form and work out which catalogue events should be visible
	// Loop over checkboxes
	for(key in this.filters){
		if(this.filters[key].type == "slider"){
			if(!this.filters[key].slider){
				this.filters[key].slider = {}
				console.log(key,this.filters[key].slider.values)
			}
		}else if(this.filters[key].type == "checkbox"){
			for(var i = 0; i < this.filters[key].options.length; i++){
				if(S('#'+this.filters[key].options[i].id).length > 0){
					this.filters[key].options[i].checked = S('#'+this.filters[key].options[i].id)[0].checked
				}
			}
		}
	}

	var _obj = this;
	function inRange(i,key,range){
		if(!_obj.cat.data[i][key]) return true;
		var valrange = [_obj.cat.getMinVal(_obj.cat.dataOrder[i],key),_obj.cat.getMaxVal(_obj.cat.dataOrder[i],key)];
		if(_obj.filters[key].format=="date"){
			valrange[0] = (new Date(valrange[0])).getTime();
			valrange[1] = (new Date(valrange[1])).getTime();
		}
		if((valrange[0] >= range[0] && valrange[0] <= range[1]) || valrange[1] >= range[0] && valrange[1] <= range[1]) return true;
		return false;
	}
	function isChecked(i,key){
		if(!_obj.cat.data[i][key]) return true;
		var best = _obj.cat.getBest(_obj.cat.dataOrder[i],key);
		var good = 0;
		for(var o = 0; o < _obj.filters[key].options.length; o++){
			if(_obj.filters[key].options[o].checked){
				if(_obj.filters[key].options[o].contains){
					// The string contains this option
					if(best.indexOf(_obj.filters[key].options[o].value) >= 0) good++;
				}else{
					if(best == _obj.filters[key].options[o].value) return true;
				}
			}
		}
		if(good == 0) return false;
		return true;
	}

	var active;
	// Loop over each waveform
	for(var i = 0; i < this.cat.length; i++){
		active = true;
		for(key in this.filters){
			a = this.filters[key];
			if(a.type == "slider"){
				// Process each slider
				if(!inRange(i,key,a.slider.values)) active = false;
			}else if(a.type == "checkbox"){
				if(!isChecked(i,key)) active = false;
			}
		}
		this.cat.data[i].waveform.active = active;
		if(active && !this.cat.data[i].waveform.data && !this.cat.data[i].waveform.loading){
			this.log('get data',i,this.cat.data[i],this.cat.data[i].waveform.active);
			this.cat.data[i].waveform.loadData();
		}
	}

	return this;
}

GWViewer.prototype.addMenu = function(){

	var _obj = this;

	function getDateRange(){
		var min = new Date();
		var max = new Date('2000');
		for(var i = 0; i < _obj.cat.data.length; i++){
			d = new Date(_obj.cat.data[i].UTC.best);
			if(d < min) min = d;
			if(d > max) max = d;
		}
		return [min,max];
	}

	function getRange(key){
		var a = _obj.filters[key];
		var range = {};
		var values = [0,0];
		var dates;
		if(typeof a.min['default']==="number") range.min = a.min['default'];
		else{
			if(a.format=='date'){
				if(!dates) dates = getDateRange();
				range.min = (dates[0]).getTime();
			}
		}
		if(typeof a.max['default']==="number") range.max = a.max['default'];
		else{
			if(a.format=='date'){
				if(!dates) dates = getDateRange();
				range.max = (dates[1]).getTime();
			}
		}
		// Set the starting values to either a specified value or the range default
		values[0] = (typeof a.min.value==="number" ? a.min.value : range.min);
		values[1] = (typeof a.max.value==="number" ? a.max.value : range.max);
		return {'range':range,'values':values };
	}

	function makeSlider(key){
		var b = getRange(key);
		b.el = S('#'+key);
		b.step = (_obj.filters[key].step||1);
		b.format = (_obj.filters[key].format||"");

		return new buildSlider(b);
	}

	function buildSlider(attr){
		if(!attr) return {};
		if(!attr.values) return {};
		if(attr.el.length != 1) return {};
		this.values = attr.values;
		this.range = attr.range;
		this.step = (attr.step||1);
		this.snap = (attr.snap||false);
		this.connect = (this.values.length==2) ? true : false;
		this.el = attr.el;

		var inputs = { 'start': this.values, 'step': this.step, 'range': this.range, 'connect': this.connect, 'snap': this.snap };
		this.slider = noUiSlider.create(this.el.find('.slider')[0], inputs);

		var _slider = this;
		this.slider.on('update', function(values, handle) {
			var value = values[handle];
			var change = false;
			if(_slider.values[handle] != parseFloat(value)) change = true;
			if (attr.log){
				_slider.values[handle] = (10**parseFloat(value)).toPrecision(2);
			}else{
				_slider.values[handle] = parseFloat(value);
			}
			var min = _slider.values[0];
			var max = _slider.values[1];
			if(attr.format && attr.format=='date'){
				min = (new Date(min)).toISOString().substr(0,10);
				max = (new Date(max)).toISOString().substr(0,10);
			}
			if(_slider.el.find('.min').length > 0) _slider.el.find('.min').html(min);
			if(_slider.el.find('.max').length > 0) _slider.el.find('.max').html(max);
		});
		this.slider.on('set',function(){
			_obj.updateFilters();
			_obj.scaleWaves();
		});
		return this;
	}

	function sliderState(slider,enabled){
		var el = S(slider.el[0]);
		if(typeof enabled!=="boolean") enabled = !(el.attr('disabled')=="true");
		if(enabled){
			el.parent().css({'display':''});
			el.attr('disabled','');
			el.find('.noUi-origin').attr('disabled','');
			el.removeClass('disabled');
		}else{
			el.parent().css({'display':'none'});
			el.attr('disabled','true');
			el.find('.noUi-origin').attr('disabled','true');
			el.addClass('disabled');
		}
		return;
	}

	function updateSliderStates(gw){
		if(gw.axes.x.logscale){
			gw.log('sliderState',gw.sliders.xoffset);
			sliderState(gw.sliders.xoffset,false);
			S('#xoffset-title').addClass('disabled').css({'display':'none'});

			sliderState(gw.sliders.xticks,false);
			S('#xticks-title').addClass('disabled').css({'display':'none'});

			S('#mergealign-outer').removeClass('disabled').css({'display':'none'});

			sliderState(gw.sliders.xlogoffset,true);
			S('#xlogoffset-title').removeClass('disabled').css({'display':''});

			gw.log('xlog');
		}else{
			sliderState(gw.sliders.xoffset,true);
			S('#xoffset-title').removeClass('disabled').css({'display':''});

			sliderState(gw.sliders.xticks,true);
			S('#xticks-title').removeClass('disabled').css({'display':''});

			S('#mergealign-outer').removeClass('disabled').css({'display':''});

			sliderState(gw.sliders.xlogoffset,false);
			S('#xlogoffset-title').addClass('disabled').css({'display':'none'});

			gw.log('xlin');
		}
		// BLAH
		if(gw.axes.y.auto){
			sliderState(gw.sliders.yspacing,false);
			S('#yspacing-title').addClass('disabled').css({'display':'none'});
		}else{
			sliderState(gw.sliders.yspacing,true);
			S('#yspacing-title').removeClass('disabled').css({'display':''});
		}
	}
	if(S('#filterform').length > 0){
		for(key in this.filters){
			a = this.filters[key]
			form = '';
			form += '<h3 lang="'+a.label+'" class="translatable"></h3><ol>';
			if(a.type == "slider"){
				form += '<li class="row range"><div id="'+key+'"><div class="slider"></div><span class="min">'+a.min['default']+'</span> &rarr; <span class="max"></span>'+(a.max.unit ? '<span lang="'+a.max.unit+'" class="translatable"></span>':'')+'</div></li>';
			}else if(a.type == "checkbox"){
				for(var i = 0; i < a.options.length; i++) form += '<li class="row"><input type="checkbox" name="'+a.options[i].id+'" id="'+a.options[i].id+'"'+(a.options[i].checked ? ' checked="checked"':'')+'></input><label for="'+a.options[i].id+'" lang="'+a.options[i].label+'" class="translatable"></label></li>';
			}
			form += '</ol>';
			S('#filterform').append(form);
			if(this.filters[key].type == "slider"){
				this.filters[key].slider = {'values':[]};
				this.filters[key].slider = new makeSlider(key);
			}
		}
		S('#filterform').on("change",{gw:this},function(e){
			_obj.updateFilters();
			_obj.scaleWaves();
		})
	}else{
		for(key in this.filters){
			if(this.filters[key].type == "slider"){
				var b = getRange(key);
				this.filters[key].slider = {'values':b.values};
			}
		}
	}

	if(this.dom.menu){
		form = '';
		form += '<ol class="top"><li class="row"><input type="checkbox" name="xlog" id="xlog"'+(this.axes.x.logscale ? ' checked="checked"':'')+'></input><label for="xlog" lang="text.gwviewer.axes.x.logscale" class="translatable"></label></li></ol>';
		form += '<h3 lang="text.gwviewer.axes.x.range" class="translatable"></h3><ol><li class="row range" id="xaxisscale"><div class="slider-outer"><div class="slider"></div><span class="min"></span> <span lang="data.time.unit" class="translatable"></span></li></ol>';
		form += '<h3 id="xoffset-title" lang="text.gwviewer.axes.x.offset" class="translatable"></h3><ol><li class="row range" id="xaxisoffset"><div class="slider-outer"><div class="slider"></div><span class="min"></span> <span lang="data.time.unit" class="translatable"></span></li></ol>';
		form += '<h3 id="xlogoffset-title" lang="text.gwviewer.axes.x.logoffset" class="translatable disabled"></h3><ol><li class="row range" id="xaxislogoffset" disabled=true"><div class="slider-outer"><div class="slider"></div><span class="min"></span> <span lang="data.time.unit" class="translatable"></span></li></ol>';
		form += '<ol class="top" id="mergealign-outer"><li class="row"><input type="checkbox" name="mergealign" id="mergealign"'+(this.query.mergealign ? ' checked="checked"':'')+'></input><label for="mergealign" lang="text.gwviewer.option.mergealign" class="translatable"></label></li></ol>';
		form += '<ol class="top"><li class="row"><input type="checkbox" name="gridlines" id="gridlines"'+(this.axes.x.gridlines ? ' checked="checked"':'')+'></input><label for="gridlines" lang="text.gwviewer.option.gridlines" class="translatable"></label></li></ol>';
		form += '<h3 lang="text.gwviewer.axes.x.ticks" class="translatable" id="xticks-title"></h3><ol><li class="row range" id="xaxisticks"><div class="slider-outer"><div class="slider"></div><span class="min"></span> <span lang="data.time.unit" class="translatable"></span></li></ol>';
		form += '<ol class="top"><li class="row"><input type="checkbox" name="yaxisauto" id="yaxisauto"'+(this.axes.y.auto ? ' checked="checked"':'')+'></input><label for="yaxisauto" lang="text.gwviewer.axes.y.auto" class="translatable"></label></li></ol>';
		form += '<h3 id="yspacing-title" lang="text.gwviewer.axes.y.spacing" class="translatable"></h3><ol><li class="row range" id="yspacing"><div><div class="slider"></div><span class="min"></span></li></ol>';
		form += '<h3 lang="text.gwviewer.axes.y.scaling" class="translatable"></h3><ol><li class="row range" id="yscale"><div><div class="slider"></div><span class="min"></span></li></ol>';
		form += '<h3 lang="text.gwviewer.option.lineWidth" class="translatable"></h3><ol><li class="row range" id="lineWidth"><div><div class="slider"></div><span class="min"></span></li></ol>';
		form += '<h3 lang="text.gwviewer.option.colourscheme" class="translatable"></h3><ol id="colourscheme-switcher"></ol>';
		form += '<h3 lang="text.gwviewer.option.labelposition" class="translatable"></h3><ol id="labelposition-switcher"></ol>';

		S('#optionsform').append(form);
		if(!this.sliders) this.sliders = {};
		this.sliders.yspacing = new buildSlider({'values':[this.axes.y.spacing],'range':{'min':10,'max':300},'step':5,'el':S('#yspacing')});
		this.sliders.yscale = new buildSlider({'values':[this.axes.y.scale/2e6],'range':{'min':0.2,'max':5},'step':0.1,'el':S('#yscale')});
		this.sliders.xscale = new buildSlider({'values':[this.axes.x.scale/1000],'range':{'min':[0.1,0.1],'40%':[2.5,0.5],'70%':[20,5],'max':[200]},'step':0.1,'el':S('#xaxisscale')});
		this.sliders.xoffset = new buildSlider({'values':[this.axes.x.offset/1000],'range':{'min':[-200,5],'20%':[-20,0.5],'35%':[-2.5,0.1],'50%':[0,0.1],'65%':[2.5,0.5],'80%':[20,5],'max':[200]},'step':0.5,'el':S('#xaxisoffset')});
		this.sliders.xlogoffset = new buildSlider({'values':[this.axes.x.logoffset.value],'range':this.axes.x.logoffset.range,'step':0.1,'el':S('#xaxislogoffset'),'log':true});
		this.sliders.xticks = new buildSlider({'values':[this.axes.x.ticks.value/1000],'range': this.axes.x.ticks.range,'snap':true,'el':S('#xaxisticks')});
		this.sliders.lineWidth = new buildSlider({'values':[this.option.lineWidth.value],'range':this.option.lineWidth.range,'step':this.option.lineWidth.step,'el':S('#lineWidth')});

		// Build colour scheme options
		opt = '';
		for(var c in this.colourschemes) opt += '<li class="row"><input type="radio" class="colourchanger" name="colourscheme" id="colourscheme-'+c+'" value="'+c+'"'+(c==this.colourscheme ? ' checked="checked"':'')+'></input><label for="colourscheme-'+c+'" lang="text.gwviewer.option.colourscheme.'+c+'" class="translatable"></label></li>';
		S('#colourscheme-switcher').html(opt);
		S('.colourchanger').on("change",{'gw':this},function(e){
			var c = e.currentTarget.value;
			if(e.data.gw.colourschemes[c]){
				e.data.gw.colourscheme = c;
				e.data.gw.draw();
			}
		});

		// Build label position options
		opt = '';
		for(var p in this.labelpositions) opt += '<li class="row"><input type="radio" class="labelposition" name="labelposition" id="labelposition-'+p+'" value="'+p+'"'+(p==this.labelposition ? ' checked="checked"':'')+'></input><label for="labelposition-'+p+'" lang="text.gwviewer.option.labelposition.'+p+'" class="translatable"></label></li>';
		S('#labelposition-switcher').html(opt);
		S('.labelposition').on("change",{'gw':this},function(e){
			var p = e.currentTarget.value;
			if(e.data.gw.labelpositions[p]){
				e.data.gw.labelposition = p;
				e.data.gw.draw();
			}
		});

		// Update the enabled/disabled states of the sliders
		updateSliderStates(this);

		// Add event to xlog checkbox
		S('#xlog').on("change",{'gw':this},function(e){
			e.data.gw.axes.x.logscale = e.currentTarget.checked;
			updateSliderStates(e.data.gw);
			e.data.gw.scaleWaves();
		});
		// Add event to mergealign checkbox
		S('#mergealign').on("change",{'gw':this},function(e){
			e.data.gw.query.mergealign = e.currentTarget.checked;
			e.data.gw.scaleWaves();
		});
		S('#gridlines').on("change",{'gw':this},function(e){
			e.data.gw.axes.x.gridlines = e.currentTarget.checked;
			e.data.gw.scaleWaves();
		});
		S('#yaxisauto').on("change",{'gw':this},function(e){
			e.data.gw.axes.y.auto = e.currentTarget.checked;
			updateSliderStates(e.data.gw);
			e.data.gw.scaleWaves();
		});
		// Add save options
		S('#save-svg').on("click",{'gw':this},function(e){ e.data.gw.save('svg'); });
		S('#save-png').on("click",{'gw':this},function(e){ e.data.gw.save('png'); });

	}else{
		this.sliders.yspacing = { values: [this.axes.y.spacing] };
		this.sliders.yscale = { values: [this.axes.y.scale/2e6] };
		this.sliders.xscale = { values: [this.axes.x.scale/1000] };
		this.sliders.xoffset = { values: [this.axes.x.offset/1000] };
		this.sliders.xlogoffset = { values: [this.axes.x.logoffset.value] };
		this.sliders.xticks = { values: [this.axes.x.ticks.value/1000] };
		this.sliders.lineWidth = { 'values': [this.option.lineWidth.value] } ;
	}

	if(this.dom.menu){
		// Add event to expandable lists
		this.dom.menu.find('.expandable').on('click',{gw:this},function(e){
			var section = S(e.currentTarget).parent();
			section.toggleClass('collapse');
			var exp = section.find('.expander');
			for(var s = 0; s < exp.length ; s++){
				var growDiv = exp[s];
				if(growDiv.clientHeight) {
					growDiv.style.height = 0;
				}else{
					growDiv.style.height = growDiv.scrollHeight + "px";
				}
			}
		});
	}

	// Add events to order buttons
	S('button.order').on('click',{gw:this},function(e){
		button = S(e.currentTarget);
		by = button.attr('order-by');
		rev = (button.attr('order-reverse') ? true : false);
		S('button.order.selected').removeClass('selected');
		button.addClass('selected');

		e.data.gw.cat.orderData(by,rev);
		e.data.gw.draw();

	});

	this.updateLanguage()

	return this;
}

// Get the list of languages
GWViewer.prototype.loadLanguageList = function(file){

	this.log('loadLanguageList')
	if(!file || typeof file!=="string") file = 'config/lang.json';

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
			this.loadLanguage('en',false);
		},
		'error': function(){
			this.log('ERROR','Unable to load '+attr.url);
		}
	});
	return this;
}

GWViewer.prototype.loadLanguage = function(l,update){

	this.log('loadLanguage');

	if(typeof update!=="boolean") update = true;

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
	if(update){
		this.lang = l;
		S('#languagelist button.selected').removeClass('selected')
		S('#lang-'+this.lang).addClass('selected');
	}

	this.log('loading',l);
	if(!this.languages[l].dict){
		this.languages[l].dict = {};
		var _filestoload = this.languages[l].files.length;
		var _filesloaded = 0;
		for(var f = 0; f < this.languages[l].files.length; f++){
			S().ajax(this.languages[l].files[f],{
				'dataType': 'json',
				'this':this,
				'success': function(data,attrs){
					this.log('complete language load',data,attrs.url);
					// Overwrite/update dictionary
					for (var attrname in data) { this.languages[l].dict[attrname] = data[attrname]; }
					_filesloaded++;
					if(_filestoload == _filesloaded) this.updateLanguage();
				},
				'error': function(){
					this.log('ERROR','Unable to load '+attr.url);
				}
			})
		}
	}else{
		this.updateLanguage();
	}
	return this;
}

// Update the interface
GWViewer.prototype.updateLanguage = function(){
	this.log('updateLanguage',this.lang);

	if(this.languages[this.lang].dict){
		this.language = this.languages[this.lang].dict;

		// Now update any elements that need updating
		var e = S('.translatable');
		for(var i = 0; i < e.length; i++){
			el = S(e[i]);
			text = el.attr('lang');
			title = el.attr('lang-title');
			if(this.language[text]) text = this.language[text];
			else {
				if(!this.query.translate && this.languages['en'].dict && this.languages['en'].dict[text]) text = this.languages['en'].dict[text];
			}
			if(this.language[title]) title = this.language[title];
			else {
				if(!this.query.translate && this.languages['en'].dict && this.languages['en'] && this.languages['en'].dict[title]) title = this.languages['en'].dict[title];
			}
			el.html(text).attr('title',title);
		}
	}

	return this;
}

GWViewer.prototype.loadCatalogue = function(file){

	this.log('loadCatalogue')
	if(!file || typeof file!=="string") file = 'gwcat/data/events.json';
	// if(!gwoscfile || typeof gwoscfile!=="string") gwoscfile = 'gwcat/data/gwosc.json';
	gwoscfile = 'gwcat/data/gwosc.json';
	var _obj = this;

	function loaded(){
		_obj.log('loaded catalogue from '+file);

		// Order the data by time (default)
		_obj.cat.orderData('UTC');

		// Load each wave
		S().ajax('config/waveforms.json',{
			'dataType': 'json',
			'this': _obj,
			'success': function(wavefiles,attrs){

				this.log('loaded waveform',wavefiles,this.cat)
				//this.setAxis('x',4500);
				for(var i = 0; i < this.cat.length; i++){
					if(!this.cat.data[i].waveform){
						if(!wavefiles[this.cat.data[i].name]) wavefiles[this.cat.data[i].name] = {};
						wavefiles[this.cat.data[i].name].callback = {
							'onload': function(a){
								_obj.scaleWaves();
							},
							'onprogress': function(a){
								_obj.draw();
							}
						}
						if(typeof wavefiles[this.cat.data[i].name].wide==="undefined") wavefiles[this.cat.data[i].name].wide = 2000;
						if(typeof wavefiles[this.cat.data[i].name].tall==="undefined") wavefiles[this.cat.data[i].name].tall = 100;
						wavefiles[this.cat.data[i].name].active = false;
						this.cat.data[i].waveform = new WaveForm(wavefiles[this.cat.data[i].name]);
						this.cat.data[i].waveform.name = this.cat.data[i].name;

					}
				}

				// Now that we are getting the data we will add the filters
				S().ajax('config/filters.json',{
					'dataType': 'json',
					'this':_obj,
					'success': function(data,attrs){
						this.filters = data;
						this.addMenu();
						this.log('need to update filters')
						this.updateFilters();
					}
				});
			},
			'error': function(){
				this.log('ERROR','Unable to load '+attr.url);
			}
		});
	}

	this.cat = new GWCat(loaded,{'fileIn':file,'datasrc':'gwosc',gwoscFile:gwoscfile});

	return this;
}


GWViewer.prototype.draw = function(format){

	this.logTime('draw')
	var lw = this.sliders.lineWidth.values[0];

	function Canvas(el,idinner){
		this.container = el;
		this.container.html('');
		this.ex = (typeof G_vmlCanvasManager != 'undefined') ? true : false;
		this.c = document.createElement("canvas");
		this.container[0].appendChild(this.c);
		S(this.c).attr('id',idinner).css({'display':'block'});
		this.el = S(this.c);

		// For excanvas we need to initialise the newly created <canvas>
		if(this.ex) this.c = G_vmlCanvasManager.initElement(this.c);

		// If the Javascript function has been passed a width/height
		// those take precedence over the CSS-set values
		if(typeof this.wide!=="number") this.wide = this.container[0].offsetWidth;
		if(typeof this.tall!=="number"){
			this.tall = window.innerHeight;//this.container[0].offsetHeight;
			if(S('#heading').length==1) this.tall -= S('#heading')[0].offsetHeight;
		}
		if(this.c && this.c.getContext){
			this.setWH(this.wide,this.tall);
			this.ctx = this.c.getContext('2d');
			this.ctx.clearRect(0,0,this.wide,this.tall);
			this.ctx.beginPath();
			this.fs = this.getFontsize();
			this.ctx.font = this.fs+"px Helvetica";
			this.ctx.fillStyle = 'rgb(255,255,255)';
			this.ctx.lineWidth = lw;
			this.ctx.fill();
		}

		return this;
	}

	Canvas.prototype.setWH = function(w,h){
		if(!w || !h) return;
		this.c.width = w;
		this.c.height = h;
		this.wide = w;
		this.tall = h;
		this.el.css({'width':w+'px','height':h+'px'});
		return this;
	}

	Canvas.prototype.getFontsize = function(){
		if(this.fontsize) return parseInt(this.fontsize);
		var m = this.wide;
		return (m < 600) ? ((m < 500) ? ((m < 350) ? ((m < 300) ? ((m < 250) ? 9 : 10) : 11) : 12) : 14) : parseInt(this.el.css('font-size'));
	}

	if(!this.canvas){
		this.canvas = new Canvas(this.dom.main,this.attr.id+'-canvas');
	}

	var svg = "";
	if(format=="svg") svg = '<svg height="'+this.canvas.tall+'" version="1.1" width="'+this.canvas.wide+'" viewBox="0 0 '+this.canvas.wide+' '+this.canvas.tall+'" xmlns="http://www.w3.org/2000/svg"><desc>Created by GWViewer '+this.version+'</desc>';

	// Set background colour
	S('#gwviewer').css({'background':(this.colourschemes[this.colourscheme].background || '')});

	if(this.canvas.ctx){

		// Clear canvas
		this.canvas.ctx.moveTo(0,0);
		this.canvas.ctx.clearRect(0,0,this.canvas.wide,this.canvas.tall);

		var n = 0;
		for(var i = 0; i < this.cat.length; i++){
			if(this.cat.data[i].waveform.active) n++;
		}
		var tscale = 1000; //to ms
		if(this.axes.x.logscale){
			var xorig = 0;	// Merge align doesn't work for a log scale as we can't have negative values
			var tlogoffset = Math.log10(parseFloat(this.sliders.xlogoffset.values[0])*tscale); //set to 0.01s
			// xlogscale = log(t)->x position
			var xlogscale = this.canvas.wide/Math.abs(Math.log10(this.axes.x.scale)-tlogoffset);
			var xlogoffset = (tlogoffset*xlogscale);
		}else{
			var xorig = (this.query.mergealign) ? this.canvas.wide*0.8 : 0;
			var xscale = this.canvas.wide/this.axes.x.scale;
			var toffset = this.sliders.xoffset.values[0]*tscale;
			var xoffset = (toffset*xscale);
		}

		// Draw grid lines
		if(this.axes.x.gridlines){
			var w = Math.ceil(this.axes.x.scale/tscale);
			this.canvas.ctx.strokeStyle = (this.colourschemes[this.colourscheme].gridline || "rgba(255,255,255,0.3)");
			this.canvas.ctx.fillStyle = (this.colourschemes[this.colourscheme].gridlinelabel || "rgba(255,255,255,0.3)");
			this.canvas.ctx.lineWidth = 1.5;
			var lines = {};
			if(this.axes.x.logscale){
				spacing = Math.log10(this.axes.x.ticks.value/tscale);
				// Get log lines
				for(var i = Math.round(tlogoffset); i < Math.log10(this.axes.x.scale)+tlogoffset+2; i += 1){
					x = Math.round(i * xlogscale + xorig) + 0.5 - xlogoffset;
					if(x > 0) lines[x] = (10**i)/tscale;
					x2 = Math.round((i+Math.log10(2)) * xlogscale + xorig) + 0.5 - xlogoffset;
					if(x2 > 0) lines[x2] = 2*(10**i)/tscale;
					x5 = Math.round((i+Math.log10(5)) * xlogscale + xorig) + 0.5 - xlogoffset;
					if(x5 > 0) lines[x5] = 5*(10**i)/tscale;
				}
			}else{
				spacing = this.axes.x.ticks.value/tscale;
				// Get positive lines
				for(var i = 0; i < this.axes.x.scale+toffset; i += this.axes.x.ticks.value){
					x = Math.round(i*xscale + xorig) + 0.5 - xoffset;
					if(x > 0) lines[x] = i/tscale;
				}
				// Get negative lines
				for(var i = this.axes.x.ticks.value; i > -(this.axes.x.scale+toffset); i -= this.axes.x.ticks.value){
					x = Math.round(i*xscale + xorig) + 0.5 - xoffset;
					if(x > 0) lines[x] = i/tscale;
				}

			}
			for(var i in lines){
				x = parseFloat(i);
				this.canvas.ctx.beginPath();
				this.canvas.ctx.moveTo(x,0);
				this.canvas.ctx.lineTo(x,this.canvas.tall);
				if(format == "svg") svg += '<path d="M '+x+',0 L '+x+','+this.canvas.tall+'" stroke="'+(this.colourschemes[this.colourscheme].gridline || "rgba(255,255,255,0.3)")+'" fill="'+(this.colourschemes[this.colourscheme].gridline || "rgba(255,255,255,0.3)")+'" stroke-width="1.5"></path>';
				this.canvas.ctx.stroke();
				if(typeof lines[i]!=="undefined"){
					this.canvas.ctx.beginPath();
					this.canvas.ctx.fillText(lines[i]+' '+this.language['data.time.unit'],x+4,this.canvas.tall-4)
					this.canvas.ctx.fill();
					svg += '<text x="'+(x+4)+'" y="'+(this.canvas.tall-4)+'" fill="'+(this.colourschemes[this.colourscheme].gridlinelabel || "rgba(255,255,255,0.3)")+'">'+lines[i]+' '+this.language['data.time.unit']+'</text>';
				}
			}
		}

		var dy = this.axes.y.spacing/2;
		if(this.axes.y.auto) dy = this.canvas.tall*(1/(n+1));

		// Loop over each waveform
		for(var i = 0, ii = 0; i < this.cat.length; i++){

			wf = this.cat.data[i].waveform;
			if(!wf.colour) wf.colour = "white";

			if(wf.active){

				this.canvas.ctx.beginPath();

				this.canvas.ctx.strokeStyle = (this.colourschemes[this.colourscheme].waveform || wf.colour);
				this.canvas.ctx.lineWidth = lw;

				yscale = this.canvas.tall/(typeof this.axes.y.scale==="number" ? this.axes.y.scale : (this.max || 2e6));
				yorig = dy*(ii+1);
				xoffsetwf = 0;

				if(wf.data){

					xoffsetwf = (this.query.mergealign) ? 0 : wf.offset*tscale*xscale;
					xoffsetwf += xoffset;
					if(format=="svg") svg += '<path d="';
					var oldpos = {'x':-100,'y':-100};
					for(var j = 0; j < wf.data.length; j++){
						if(wf.data[j]){
							if (this.axes.x.logscale){
								pos = {'x':(xorig+Math.log10(wf.data[j].t-wf.offset*tscale)*xlogscale-xlogoffset),'y':(yorig+Math.round(wf.data[j].hp*yscale))};
							}else{
								pos = {'x':(xorig+wf.data[j].t*xscale-xoffsetwf),'y':(yorig+Math.round(wf.data[j].hp*yscale))};
							}
							if(j==0) this.canvas.ctx.moveTo(pos.x,pos.y);
							else this.canvas.ctx.lineTo(pos.x,pos.y);
							if(format=="svg"){
								if(j==0) svg += 'M '+pos.x.toFixed(1)+','+pos.y.toFixed(1);
								else{
									if(Math.abs(pos.x-oldpos.x)+Math.abs(pos.y-oldpos.y) > 1){
										svg += ' L '+pos.x.toFixed(1)+','+pos.y.toFixed(1);
										oldpos.x = pos.x;
										oldpos.y = pos.y;
									}
								}
							}
						}
					}
					if(format=="svg") svg += '" stroke="'+(this.colourschemes[this.colourscheme].waveform || wf.colour)+'" stroke-width="'+lw+'" fill="none" />';
				}
				this.canvas.ctx.stroke();

				// Only draw labels if they are visible
				if(this.labelposition != "hidden"){

					this.canvas.ctx.beginPath();
					this.canvas.ctx.fillStyle = (this.colourschemes[this.colourscheme].waveformlabel || wf.colour);
					this.canvas.ctx.textBaseline = "middle";

					x = 0;
					y = (yorig-(dy-this.canvas.fs)/2);
					w = this.canvas.ctx.measureText(this.cat.data[i].name).width;
					// If we are "auto" or "endmerger" we try setting the x-position to the merger
					if(this.labelposition == "auto" || this.labelposition == "endmerger"){
						if (this.axes.x.logscale){
							x = (xorig+Math.log10(wf.tmerge-wf.offset*tscale)*xlogscale-xlogoffset) + this.canvas.fs/2;
						}else{
							x = (xorig+wf.tmerge*xscale-xoffsetwf) + this.canvas.fs/2;
						}
						// If the text label doesn't fit on the screen we'll clear the x-position
						if(this.labelposition == "auto" && x + w > this.canvas.wide) x = 0;
					}
					// Fall back to start if the x-value hasn't been set yet
					if(x==0) x = this.canvas.fs/2;

					this.canvas.ctx.fillText(this.cat.data[i].name,x,y);
					this.canvas.ctx.fill();
					if(format=="svg") svg += '<text class="Label" x="'+x+'" y="'+y+'" style="text-anchor:left" fill="'+(this.colourschemes[this.colourscheme].waveformlabel || wf.colour)+'">'+this.cat.data[i].name+'</text>';
				}

				ii++;
			}
		}
	}
	if(format=="svg") svg += '</svg>';

	this.logTime('draw')

	//if(format=="svg") S('#gwviewer').append(svg);
	return (svg||this);
}

GWViewer.prototype.scaleWaves = function(){
	this.log('scaleWaves')
	var max = 0;
	var n = 0;
	for(var i = 0; i < this.cat.length; i++){
		if(this.cat.data[i].waveform.max > max) max = this.cat.data[i].waveform.max;
		if(this.cat.data[i].waveform.active) n++;
	}
	if(this.axes.x.logscale){
		this.axes.x.scale = this.sliders.xscale.values[0]*1000;
		this.axes.x.ticks.value = this.sliders.xticks.values[0]*1000;
	}else{
		this.axes.x.scale = this.sliders.xscale.values[0]*1000;
		this.axes.x.ticks.value = this.sliders.xticks.values[0]*1000;
	}
	this.axes.y.scaling = this.sliders.yscale.values[0];
	this.axes.y.scale = max*(n)/this.axes.y.scaling;
	this.axes.y.spacing = this.sliders.yspacing.values[0];

	this.draw();
	return this;
}


GWViewer.prototype.setAxis = function(t,size){
	this.axes[t].scale = size;
	return this;
}

GWViewer.prototype.save = function(type){

	// Bail out if there is no Blob function to save with
	if(typeof Blob!=="function") return this;
	var opts = { 'type': '', 'file': '' };

	function save(content){
		var asBlob = new Blob([content], {type:opts.type});
		function destroyClickedElement(event){ document.body.removeChild(event.target); }

		var dl = document.createElement("a");
		dl.download = opts.file;
		dl.innerHTML = "Download File";
		if(window.webkitURL != null){
			// Chrome allows the link to be clicked
			// without actually adding it to the DOM.
			dl.href = window.webkitURL.createObjectURL(asBlob);
		}else{
			// Firefox requires the link to be added to the DOM
			// before it can be clicked.
			dl.href = window.URL.createObjectURL(asBlob);
			dl.onclick = destroyClickedElement;
			dl.style.display = "none";
			document.body.appendChild(dl);
		}
		dl.click();

	}

	if(type == "svg"){
		svg = this.draw('svg');
		opts.type = 'image/json';
		opts.file = 'waveform.svg';
		save(svg);
	}
	if(type == "png"){
		opts.type = "image/png";
		opts.file = "timeseries.png";
		this.canvas.c.toBlob(save,opts.type);
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

	return this;
}

WaveForm.prototype.log = function(){
	if(this.logging || arguments[0]=="ERROR"){
		var args = Array.prototype.slice.call(arguments, 0);
		if(console && typeof console.log==="function"){
			if(arguments[0] == "ERROR") console.log('%cERROR%c %cWaveForm%c: '+args[1],'color:white;background-color:#D60303;padding:2px;','','font-weight:bold;','',(args.length > 2 ? args.splice(2):""));
			else if(arguments[0] == "WARNING") console.log('%cWARNING%c %cWaveForm%c: '+args[1],'color:white;background-color:#F9BC26;padding:2px;','','font-weight:bold;','',(args.length > 2 ? args.splice(2):""));
			else console.log('%cWaveForm%c','font-weight:bold;','',args);
		}
	}
	return this;
}

WaveForm.prototype.addData = function(data){
	this.loading = true;
	this.datastr = data;
	this.parse();
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
		this.log('loadData: No file provided to load from');
		return this;
	}
	S().ajax(this.file,{
		'dataType': 'text',
		'this':this,
		'success': function(data,attrs){
			this.log('complete',attrs,this);
			this.endData(data);
			if(typeof this.callback.onload==="function") this.callback.onload.call(this);
		},
		'progress': function(e,attrs){
			this.log('progress',attrs,this);
			this.addData(e.target.responseText);
			if(typeof this.callback.onprogress==="function") this.callback.onprogress.call(this);
		},
		'error': function(){
			this.log('ERROR','Unable to load '+attr.url);
		}
	});
	return this;
}

WaveForm.prototype.parse = function(){
	this.log('parse',this);
	var xscale = 1000;	// into milliseconds
	var yscale = 1e24;

	if(!this.datastr) return this;
	// Parse the data string
	var d = this.datastr;
	d = d.substr(0,d.lastIndexOf('\n'));
	d = d.split(/[\n\r]+/);
	// Re-write badly formatted headings
	if(d[0].indexOf("  ") > 0) d[0] = d[0].replace(/time \(seconds\)/g,"t").replace(/strain \* 1.e21/g,"strain*1e21").replace(/ {2,}/g," ");

	this.data = new Array(d.length-1);
	var ids = d[0].replace(/^# /,'').split(/ /);
	var idx = {};
	var scaling = 1;
	for(var j = 0; j < ids.length; j++) idx[ids[j]] = j;
	if(typeof idx.t==="undefined"){
		if(typeof idx['time (seconds)']==="number"){
			idx.t = idx['time (seconds)'];
		}else return this;
	}
	if(typeof idx.hp==="undefined"){
		if(typeof idx['strain*1e23']==="number"){
			idx.hp = idx['strain*1e23'];
			scaling = 1e-23;
		}else if(typeof idx['strain*1e21']==="number"){
			idx.hp = idx['strain*1e21'];
			scaling = 1e-21;
		}else return this;
	}
	this.max = -1e12;
	var v;
	for(var row = 1; row < d.length; row++){
		if(d[row]){
			cols = d[row].split(/ /);
			this.data[row-1] = {'t':parseFloat(cols[idx.t])*xscale,'hp':parseFloat(cols[idx.hp])*yscale*scaling};
			// Find the maximum amplitude
			v = Math.abs(this.data[row-1].hp);
			if(v > this.max) this.max = v;
		}
	}
	this.max *= 2;

	return this;
}
