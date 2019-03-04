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
		this.logging = true;

		this.loadLanguages();
		this.loadHelp();
		
		return this;
	};
	
	Translator.prototype.loadHelp = function(){
		this.log('loadHelp',this.formfile);
		S(document).ajax(this.formfile,{
			'dataType': 'json',
			'this': this,
			'success': function(d,attr){
				this.form = d;
				this.init();
			},
			'error': function(err,attr){
				this.log('ERROR','Unable to load '+attr.url,err)
			}		
		});
		return this;
	};

	Translator.prototype.loadLanguages = function(){
		this.log('loadLanguages',this.langfile);
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
				this.log('ERROR','Unable to load '+attr.url,err)
			}
		});

		return this;
	};

	Translator.prototype.init = function(){
		this.log('init');
		if(!this.langdefault){
			this.log('ERROR','No default language set. Please make sure '+this.langfile+' has a default language set. Just add a %c"default": true%c','font-weight: bold;color:#0DBC37');
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
			this.log('ERROR','The language '+this.lang+' does not appear to exist in the translation file.');
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

	Translator.prototype.log = function(){
		if(this.logging || arguments[0]=="ERROR"){
			var args = Array.prototype.slice.call(arguments, 0);
			if(console && typeof console.log==="function"){
				if(arguments[0] == "ERROR") console.log('%cERROR%c %cTranslator%c: '+args[1],'color:white;background-color:#D60303;padding:2px;','','font-weight:bold;','',(args.length > 2 ? args.splice(2):""));
				else if(arguments[0] == "WARNING") console.log('%cWARNING%c %cTranslator%c: '+args[1],'color:white;background-color:#F9BC26;padding:2px;','','font-weight:bold;','',(args.length > 2 ? args.splice(2):""));
				else console.log('%cTranslator%c','font-weight:bold;','',args);
			}
		}
		return this;
	};

	Translator.prototype.setLanguage = function(lang){
		this.log('setLanguage',lang)
		// If a language is provided, set it
		if(lang) this.lang = lang;

		// Load the specified language
		this.loadLanguage(this.lang);

		return this;
	};

	Translator.prototype.loadLanguage = function(lang){
		this.log('loadLanguage',lang);
		if(!lang) lang = this.langdefault;

		// Is the language already loaded?
		if(this.langs[lang].filesloaded==this.langs[lang].files.length){
			this.log('Already loaded '+this.phrasebook['meta.name'][lang].value+' ('+lang+')');
			return this.processLanguage(lang);
		}

		// Set the loaded files counter for this language
		this.langs[lang].filesloaded = 0;

		for(var f = 0; f < this.langs[lang].files.length; f++){
			this.log('Loading file '+this.langs[lang].files[f]);
			
			S(document).ajax(this.langs[lang].files[f],{
				dataType: 'json',
				this: this,
				lang: lang,
				i: f,
				error: function(err,attr){
					// We couldn't find this language so load the English version
					// so there is something to work from.
					this.log('ERROR',"Couldn't load "+attr.lang)
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
		this.log('processLanguage',lang);
		
		if(lang){
			var hrefcat = S('a.langlinkcat').attr('href');
			S('a.langlinkcat').attr('href',hrefcat.substring(0,hrefcat.indexOf('?'))+'?lang='+this.phrasebook['meta.code'][lang].value);
			S('.langname').html(this.phrasebook['meta.name'][lang].value);
		}

		this.rebuildForm();

		return this;
	};

	Translator.prototype.rebuildForm = function(){
		this.log('rebuildForm',this.phrasebook);

		var html = "<form id=\"language\">"+this.buildForm()+"</form>";

		S('#translation').html(html);
		
		S('#translation input, #translation textarea, #translation select').attr('dir',(this.phrasebook && this.phrasebook["meta.alignment"] && this.phrasebook["meta.alignment"][this.lang]=="right" ? "rtl" : "ltr")).on('change',{me:this},function(e){
			e.data.me.update();
		});

		this.getOutput();

		return this;
	};

	Translator.prototype.update = function(){
		this.getOutput();
		this.percentComplete();
		var f = S('#translation input, #translation textarea, #translation select');
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
		
		var inpdef = (this.phrasebook[key] ? this.phrasebook[key][this.langdefault].value : '');
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
			if(this.phrasebook[key][this.langdefault].value && !done[key]){
				this.misc[key] = true;
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
		var percent = 100;
		if(this.lang!="en"){
			var total = 0;
			var diff = 0;
			percent = Math.floor(100*diff/total);
		}
		//S("#complete").html(percent);
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
		var lang = this.lang;
		var i,f,file,k,key,source,val,css,out;

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
			}
		}
		
		// Loop over every element not in the master and add it to an appropriate JSON for each output file
		for(key in this.misc){
			if(this.phrasebook[key] && this.phrasebook[key][this.langdefault]){
				source = this.phrasebook[key][this.langdefault].source;
				val = (S('#'+safeKey(key))[0].value || "");
				output[source].json.push('"'+key+'": "'+val+'"');
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
		S('#page').html().replace(/\(([a-zA-Z0-9\.\-]+) AT ([a-zA-Z0-9\.\-]+)\)/,function(m,p1,p2){
			email = p1+'@'+p2;
			return p1;
		});
		etxt = (S('.email a').length == 1) ? S('.email a').html() : S('.email').html();
		lang = S('#meta-name')[0].value;
		S('.email').html('<a href="mailto:'+email+'?subject='+this.phrasebook['text.gwviewer.information.title'].en.value+': '+lang+' translation&body='+encodeURI('Hi Chris,\n\nHere is an update to the '+lang+' translation.\n\nBest regards,\n\nNAME\n\n\n')+''+encodeURI(json)+'">'+etxt+'</a>')
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

	// Add CommonGround as a global variable
	root.Translator = Translator;

})(window || this); // Self-closing function


