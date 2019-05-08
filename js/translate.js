/*
	Translation library
*/
(function(root){

	// Get the URL query string and parse it
	function getQuery() {
		var r = {length:0};
		var q = location.search;
		if(q && q != '#'){
			// remove the leading ? and trailing &
			q = q.replace(/^\?/,'').replace(/\&$/,'');
			q.split('&').forEach(function(element){
				var key = element.split('=')[0];
				var val = element.split('=')[1];
				if(/^[0-9.]+$/.test(val)) val = parseFloat(val);	// convert floats
				r[key] = val;
				r['length']++;
			});
		}
		return r;
	};

	function Translator(inp){

		this.q = getQuery();
		this.id = (inp && typeof inp.id==="string") ? inp.id : 'form';
		this.langfile = (inp && typeof inp.languages==="string") ? inp.languages : '';
		this.formfile = (inp && typeof inp.help==="string") ? inp.help : '';
		this.langs = (inp && typeof inp.langs==="object") ? inp.langs : { 'en': {'name':'English'} };
		// Set empty help and phrasebook
		this.form = undefined;
		this.phrasebook = undefined;
		this.log = new Logger({'id':'Translator','logging':true});

		this.loadLanguages();
		this.loadHelp();
		
		return this;
	};
	
	Translator.prototype.loadHelp = function(){
		this.log.message('loadHelp',this.formfile);
		S(document).ajax(this.formfile,{
			'dataType': 'json',
			'this': this,
			'success': function(d,attr){
				this.form = d;
				this.init();
			},
			'error': function(err,attr){
				this.log.error('Unable to load '+attr.url,err)
			}		
		});
		return this;
	};

	Translator.prototype.loadLanguages = function(){
		this.log.message('loadLanguages',this.langfile);
		S(document).ajax(this.langfile,{
			'dataType': 'json',
			'this': this,
			'success': function(d,attr){
				this.langs = d;
				for(var l in this.langs){
					if(this.langs[l]['default']) this.langdefault = l;
				}
				this.init();
			},
			'error': function(err,attr){
				this.log.error('Unable to load '+attr.url,err)
			}
		});

		return this;
	};

	Translator.prototype.init = function(){
		this.log.message('init');
		if(!this.langdefault){
			this.log.error('No default language set. Please make sure '+this.langfile+' has a default language set. Just add a %c"default": true%c','font-weight: bold;color:#0DBC37');
			return this;
		}
		
		// We need both input files (languages and the form) to continue
		if(!this.form || !this.langs) return this;
		
		// Load the master language config file
		this.setLanguage();

		this.lang = this.q.lang;
		if(!this.lang) this.lang = "en";
		
		this.page = S('#'+this.id);

		if(!this.langs[this.lang]){
			this.log.error('The language '+this.lang+' does not appear to exist in the translation file.');
			this.page.html('The language '+this.lang+' does not appear to exist yet.');
			return this;
		}

		html = "<form id=\"langchoice\"><label>Select language (not all are complete):</label><select name=\"lang\">"
		for(var l in this.langs) html += '<option name="'+l+'" value="'+l+'"'+(this.lang==l ? " selected" : "")+'>'+this.langs[l].name+'</option>';
		html += "</select> <button id=\"newlang\">Create new language</button></form>";


		if(S('#translate_chooser').length == 0) this.page.prepend('<div id="translate_chooser"></div>');
		if(S('#translation').length == 0) this.page.append('<div id="translation"></div>')
		S('#translate_chooser').html(html).find('#langchoice select').on('change',{me:this},function(e){ e.data.me.setLanguage(e.currentTarget.value); });

		S('#newlang').on('click',{me:this},function(e){
			e.preventDefault();
			var f = S('#translation input, #translation textarea, #translation select');
			for(var i = 0; i < f.length; i++) f[i].value = "";
			e.data.me.update();
		});
		this.setLanguage(this.lang);

		return this;
	};

	Translator.prototype.setLanguage = function(lang){
		this.log.message('setLanguage',lang)
		// If a language is provided, set it
		if(lang) this.lang = lang;

		// Load the specified language
		this.loadLanguage(this.lang);

		return this;
	};

	Translator.prototype.loadLanguage = function(lang){
		this.log.message('loadLanguage',lang);
		if(!lang) lang = this.langdefault;

		// Is the language already loaded?
		if(this.langs[lang].filesloaded==this.langs[lang].files.length){
			this.log.message('Already loaded '+this.phrasebook['meta.name'][lang].value+' ('+lang+')');
			return this.processLanguage(lang);
		}

		// Set the loaded files counter for this language
		this.langs[lang].filesloaded = 0;

		for(var f = 0; f < this.langs[lang].files.length; f++){
			this.log.message('Loading file '+this.langs[lang].files[f]);
			
			S(document).ajax(this.langs[lang].files[f],{
				dataType: 'json',
				this: this,
				lang: lang,
				i: f,
				error: function(err,attr){
					// We couldn't find this language so load the English version
					// so there is something to work from.
					this.log.error("Couldn't load "+attr.lang)
					if(attr.lang != "en") this.loadLanguage('en');
				},
				success: function(data,attr){
					// Increment the loaded file counter
					this.langs[attr.lang].filesloaded++;
					// Loop over all the keys in the file
					for(var key in data){
						if(data[key]){
							if(!this.phrasebook) this.phrasebook = {};
							if(!this.phrasebook[key]) this.phrasebook[key] = {};
							this.phrasebook[key][attr.lang] = {'source':attr.url,'value':data[key] };
						}
					}
					// Got all the files for this language
					if(this.langs[attr.lang].filesloaded==this.langs[attr.lang].files.length) this.processLanguage(attr.lang);
				}
			});
		}

		return this;
	};
	
	Translator.prototype.processLanguage = function(lang){
		this.log.message('processLanguage',lang);
		
		if(lang){
			var hrefcat = S('a.langlinkcat').attr('href');
			S('a.langlinkcat').attr('href',hrefcat.substring(0,hrefcat.indexOf('?'))+'?lang='+(this.phrasebook['meta.code'] ? this.phrasebook['meta.code'][lang].value:''));
			S('.langname').html(this.phrasebook['meta.name'][lang].value);
		}

		this.rebuildForm();

		return this;
	};

	Translator.prototype.rebuildForm = function(){
		this.log.message('rebuildForm',this.phrasebook);

		var html = "<form id=\"language\">"+this.buildForm()+"</form>";

		S('#translation').html(html);
		
		S('#translation input, #translation textarea, #translation select').on('change',{me:this},function(e){
			e.data.me.update();
		});

		this.update();

		return this;
	};

	Translator.prototype.update = function(){
		this.getOutput();
		this.percentComplete();
		var f = S('#translation input, #translation textarea, #translation select');

		var dir = (this.phrasebook && this.phrasebook["meta.alignment"]) ? this.phrasebook["meta.alignment"][this.lang]=="right" : "";
		if(S('#meta-alignment').length == 1) dir = S('#meta-alignment')[0].value;
		
		dir = (dir=="right" ? "rtl" : "ltr");
		f.attr('dir',dir);
		S('#translation').removeClass('ltr').removeClass('rtl').addClass(dir).attr('dir',dir);
		
		for(var i = 0; i < f.length; i++){
			if(f[i].value && S(f[i]).hasClass('error')) S(f[i]).removeClass('error').removeClass('blank');
			else if(!f[i].value) S(f[i]).addClass('error').addClass('blank');
		}
		return this;
	};

	Translator.prototype.buildField = function(key,field){
		var d;
		var inp = "";
		var ldef = this.phrasebook["meta.name"][this.langdefault].value;
		var newk = safeKey(key);
		var cl = sanitize((field._highlight ? "highlight" : ""))
		cl = sanitize((this.phrasebook && this.phrasebook[key] && this.phrasebook[key][this.lang] ? cl : "blank error"));
		var p = (this.phrasebook && this.phrasebook[key] && this.phrasebook[key][this.lang] ? this.phrasebook[key][this.lang].value : "");
		
		var inpdef = (this.phrasebook[key] && this.phrasebook[key][this.langdefault] ? this.phrasebook[key][this.langdefault].value : '');
		if(field._type=="textarea"){
			css = (field._height) ? ' style="height:'+field._height+'"' : "";
			inp = '<textarea class="'+cl+'" id="'+newk+'" name="'+newk+'"'+css+'>'+sanitize(p || (field._usedef ? inpdef : ""))+'</textarea>';
		}else if(field._type=="noedit"){
			inp = '<input type="hidden" id="'+newk+'" name="'+newk+'" value="'+sanitize(p)+'" />'+sanitize(p);
			inpdef = "";
		}else if(field._type=="select"){
			inp = '<select id="'+newk+'" name="'+newk+'">';
			for(var o = 0; o < field._options.length ; o++){
				var seldef = (d && field._options[o].value==d[key]) ? ' selected="selected"' : '';
				var sel = (p && field._options[o].value==p) ? ' selected="selected"' : (field._usedef) ? seldef : '';
				inp += '<option value="'+field._options[o].value+'"'+sel+'>'+field._options[o].name+'</option>'
				if(field._options[o].value == inpdef) inpdef = field._options[o].name;
			}
			inp += '</select>';
		}else if(field._type=="string"){
			inp = '<input type="text" class="'+cl+'" id="'+newk+'" name="'+newk+'" value="'+sanitize(p || (field._usedef ? inpdef : ""))+'" />';
		}
		return this.row((field._title ? field._title : key),field._text,inp,ldef,inpdef);
	}
	
	Translator.prototype.buildForm = function(){

		var d,k,n,css;
		var html = "";
		var newk = "";
		var inp = "";
		var arr = false;
		var ldef = this.phrasebook["meta.name"][this.langdefault].value;
		var inpdef = "";
		k = "";
		done = {};

		// Loop over the help file keys
		for(key in this.form){

			if(typeof this.form[key]==="object"){
				newk = safeKey(key);
				if(this.form[key]._text && this.form[key]._type){
					html += this.buildField(key,this.form[key]);
					done[key] = true;
				}else{

					// If this section has a title
					if(this.form[key]._level){
						l = this.form[key]._level;
						html += '<h'+l+'>'+this.form[key]._title+'</h'+l+'>';
					}
					if(this.form[key]._text){
						html += "	<div class=\"subt\">";
						html += "		<p>"+this.form[key]._text+"</p>";
						html += "	</div>";
					}
					if(n >= 0) html += '<div class="group">';
				}
			}
		}

		this.misc = {};
		// Loop over the default language keys
		for(key in this.phrasebook){
			if(this.phrasebook[key] && this.phrasebook[key][this.langdefault] && this.phrasebook[key][this.langdefault].value && !done[key]){
				this.misc[key] = true;
			}else{
				this.log.warning('Unable to set '+key);
			}
		}

		if(this.misc){
			html += '<h2>Misc options</h2>';
			for(var f in this.misc){
				html += this.buildField(f,{"_title":f,"_text":f,"_type":"string"});
			}
		}


		return html;
	};

	Translator.prototype.percentComplete = function(){
		var percent = (100*this.count.done/this.count.total).toFixed(1);
		S('#progressbar .progress-inner').css({'width':percent+'%'});
		return this;
	};

	Translator.prototype.row = function(title,desc,field,ldef,def){
		var id = field.indexOf("id=\"");
		id = field.substr(id+4);
		id = id.substr(0,id.indexOf("\""));

		var html = "	<fieldset>";// id=\"fs"+id+"\">";
		html += "		<legend>"+title+"</legend>";
		html += "		<div class=\"twocol\">";
		html += "			<label for=\""+id+"\">"+desc+"</label>";
		html += "		</div>";
		html += "		<div class=\"fourcol\">";
		html += "			"+field;
		html += "			<div class=\"default\"><strong>"+ldef+" (default):</strong> "+def+"</div>";
		html += "		</div>";
		html += "	</fieldset>";
		return html;
	};

	Translator.prototype.getOutput = function(){
	
		var output = {};
		var i,f,file,k,key,source,val,css,out;
		this.count = { 'done': 0,'total': 0 };
		var lang = (S('#meta-code')[0].value || this.lang);

		if(S('#output').length == 0) S('#translation').after('<div id="output"></div>');


		for(f = 0; f < this.langs[this.langdefault].files.length; f++){
			output[this.langs[this.langdefault].files[f]] = {'file':this.langs[this.langdefault].files[f].replace(new RegExp("([^A-Za-z])"+this.langdefault+"([^A-Za-z])"),function(m,p1,p2){ return p1+lang+p2; }),'json':[]};
		}
		// Loop over every element and add it to an appropriate JSON for each output file
		for(key in this.form){
			if(this.phrasebook[key] && this.phrasebook[key][this.langdefault] && this.form[key]["_type"]){
				source = this.phrasebook[key][this.langdefault].source;
				val = (S('#'+safeKey(key))[0].value || "");
				output[source].json.push('"'+key+'": "'+val+'"');
				if(val) this.count.done++;
				this.count.total++;
			}
		}
		
		// Loop over every element not in the master and add it to an appropriate JSON for each output file
		for(key in this.misc){
			if(this.phrasebook[key] && this.phrasebook[key][this.langdefault]){
				source = this.phrasebook[key][this.langdefault].source;
				val = (S('#'+safeKey(key))[0].value || "");
				output[source].json.push('"'+key+'": "'+val+'"');
				if(val) this.count.done++;
				this.count.total++;
			}
		}
	
		f = 0;
		S('#output').html('');
		json = '';
		for(file in output){
			if(f > 0) json += '\n\n';
			json += output[file].file+':\n';
			json += '{\n';
			for(i = 0; i < output[file].json.length; i++){
				if(i > 0) json += ',\n';
				json += '\t'+output[file].json[i];
			}
			json += '\n}';
			f++;
		}
		json = sanitize(json);
			
		css = (json) ? ' style="height:'+((json.split("\n").length+((this.langs[this.langdefault].files.length)*2))+5)+'em;overflow-x:hidden;font-family:monospace;"' : ''
		out = '<textarea onfocus="this.select()"'+css+' wrap="off">'+json+"</textarea>";
		
		var email;
		this.page.html().replace(/\(([a-zA-Z0-9\.\-]+) AT ([a-zA-Z0-9\.\-]+)\)/,function(m,p1,p2){
			email = p1+'@'+p2;
			return p1;
		});
		etxt = (S('.email a').length == 1) ? S('.email a').html() : S('.email').html();
		lang = S('#meta-name')[0].value;
		S('.email').html('<a href="mailto:'+email+'?subject='+(this.phrasebook['text.gwviewer.information.title'] ? this.phrasebook['text.gwviewer.information.title'].en.value:'')+': '+lang+' translation&body='+encodeURI('Hi Chris,\n\nHere is an update to the '+lang+' translation.\n\nBest regards,\n\nNAME\n\n\n')+''+encodeURI(json)+'">'+etxt+'</a>')
		S('#output').append(out);

		return this;
	};

	function safeKey(k){
		return k.replace(/\./g,'-');
	}

	function sanitize(str){
		if(str){
			str = str.replace(/</g,"&lt;");
			str = str.replace(/>/g,"&gt;");
			str = str.replace(/"/g,"&quot;");
		}
		return str;
	}

	/**
	 * @desc Create a logger for console messages and timing
	 * @param {boolean} inp.logging - do we log messages to the console?
	 * @param {boolean} inp.logtime - do we want to log execution times?
	 * @param {string} inp.id - an ID to use for the log messages (default "JS")
	 */
	function Logger(inp){
		if(!inp) inp = {};
		this.logging = (inp.logging||false);
		this.logtime = (inp.logtime||false);
		this.id = (inp.id||"JS");
		this.metrics = {};
		this.error = function(){ this.log('ERROR',arguments); };
		this.warning = function(){ this.log('WARNING',arguments); };
		this.info = function(){ this.log('INFO',arguments); };
		this.message = function(){ this.log('MESSAGE',arguments); }
		return this;
	}
	/**
	 * @desc A wrapper for log messages. The first argument is the type of message e.g. "ERROR", "WARNING", "INFO", or "MESSAGE". Other arguments are any objects/values you want to include.
	 */
	Logger.prototype.log = function(){
		if(this.logging || arguments[0]=="ERROR" || arguments[0]=="WARNING" || arguments[0]=="INFO"){
			var args,args2,bold;
			args = Array.prototype.slice.call(arguments[1], 0);
			args2 = (args.length > 1 ? args.splice(1):"");
			// Remove array if only 1 element
			if(args2.length == 1) args2 = args2[0];
			bold = 'font-weight:bold;';
			if(console && typeof console.log==="function"){
				if(arguments[0] == "ERROR") console.error('%c'+this.id+'%c: '+args[0],bold,'',args2);
				else if(arguments[0] == "WARNING") console.warn('%c'+this.id+'%c: '+args[0],bold,'',args2);
				else if(arguments[0] == "INFO") console.info('%c'+this.id+'%c: '+args[0],bold,'',args2);
				else console.log('%c'+this.id+'%c: '+args[0],bold,'',args2);
			}
		}
		return this;
	}
	/**
	 * @desc Start/stop a timer. This will build metrics for the key containing the start time ("start"), weighted average ("av"), and recent durations ("times")
	 * @param {string} key - the key for this timer
	 */
	Logger.prototype.time = function(key){
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
			if(this.logtime) this.info(key+' '+t+'ms ('+this.metrics[key].av.toFixed(1)+'ms av)');
			delete this.metrics[key].start;
		}
		return this;
	};
	// Add CommonGround as a global variable
	root.Translator = Translator;

})(window || this); // Self-closing function


