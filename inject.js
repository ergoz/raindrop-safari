document.addEventListener("beforeload", function() {
	if (window.top !== window)
		event.preventDefault();
}, true);

var RainDropPanzer;

if (window.top === window) {
	RainDropPanzer={
		minWidth: 300,
		minHeight: 300,
		siteOverrides: {'vk.com': ['#fw_post_wrap div.fw_post_info:eq(0) > div:eq(1)', '#pv_photo', '#mv_content', '#wl_post_body']},

		grabArticle: null,
		item: {},
		working:{},
		helpers: {
			iframe: function(attrs) {
	            return '<div class="raindropLikeVideo"><iframe '+(attrs.width!=undefined ? ' width="'+attrs.width+'" ':' ' )+(attrs.height!=undefined ? ' height="'+attrs.height+'" ':' ' )+' src="'+attrs.src+'" frameborder="0" allowfullscreen></iframe></div>'
	                	+(attrs.excerpt!=undefined ? '<div class="raindropLikeVideoDescription">'+attrs.excerpt+'</div>' : '');
	        },

	        html5video: function(attrs) {
	            var str='<div class="raindropLikeVideo"><video '+(attrs.width!=undefined ? ' width="'+attrs.width+'" ':' ' )+(attrs.height!=undefined ? ' height="'+attrs.height+'" ':' ' )+' src="'+attrs.src+'"></video></div>'
					+(attrs.excerpt!=undefined ? '<div class="raindropLikeVideoDescription">'+attrs.excerpt+'</div>' : '');
					console.log(str); return str;
	        },

	        image: function(attrs) {
	        	if (attrs.src[0]!=undefined)
	        		attrs.src=attrs.src[0];

	            var str = '<div class="raindropLikeImage">';
	            if (attrs.url!=undefined)
	               str+='<a href="'+attrs.url+'" target="_blank">';
	            str+='<img src="'+attrs.src+'" />';
	            if (attrs.url!=undefined)
	               str+='</a>';
	            str+='</div>';
	            if (attrs.excerpt!=undefined)
	            	str+='<div class="raindropLikeImageDescription">'+attrs.excerpt+'</div>';
	            return str;
	        },

	        removeDublicates: function(arr) {
				var i,
					len=arr.length,
					out=[],
					obj={};

				for (i=0;i<len;i++)
					obj[arr[i]]=0;
				
				for (i in obj)
					out.push(i);
				
				return out;
			},

			parseUrl: function(url) {
				var	a      = document.createElement('a');
					a.href = url;
				return a.protocol+'//'+a.hostname+a.pathname+a.search;
			},

			collapseWhitespace: function(s) {
				s = s.replace(/[\s\xa0]+/g, ' ').replace(/^\s+|\s+$/g, '');
				return s;
			},

			truncate: function(str, length, pruneStr) {
				pruneStr = pruneStr || '...';

				if (str.length <= length) return str;

				var r = new RegExp('^(.{' + length.toString() + '}\S*).*$');
				return str.replace(r,"$1") + pruneStr;
			}
		},

		//Run now
		run:function(doneCallback) {
			this.item={
				url: window.location.href,
				media: [],
				html: '',
				excerpt: '',
				title: '',
				domain: window.location.hostname,
				type: 'link'
			};
			this.working={
				metaTags: {},
				media: [],
				type: ''
			};

			this.prepareHTML();

			//set title
			if (this.item.title == '')
				this.item.title = $('head title').text();

			switch( this.item.type ) {
				case 'video':
					if (this.working.html5video==true)
						this.item.html = this.helpers.iframe({//html5video
							src: this.working.metaTags['video'],
							width: this.working.metaTags['width'],
							height: this.working.metaTags['height'],
							excerpt: this.item.excerpt
						});
					else
						this.item.html = this.helpers.iframe({
							src: this.working.metaTags['player'],
							width: this.working.metaTags['width'],
							height: this.working.metaTags['height'],
							excerpt: this.item.excerpt
						});

					this.done(doneCallback);
				break;
				case 'image':
					this.item.html = this.helpers.image({
						src: this.working.metaTags['image'],
						url: this.item.url,
						excerpt: this.item.excerpt
					});

					this.done(doneCallback);
				break;
				case 'specific':
					var overID=-1;
					for(var i in RainDropPanzer.siteOverrides[this.item.domain])
						if ($(RainDropPanzer.siteOverrides[this.item.domain][i]+':visible').length>0)
							overID=i;

					if (overID>=0){
						//get images
						$('img', RainDropPanzer.siteOverrides[this.item.domain][overID]).each( function() {
							src = RainDropPanzer.helpers.parseUrl($(this).attr('src'));
							RainDropPanzer.working.media.push( $(this).attr('src') );
							$(this).attr('src', src);
						} );

						this.item.html = $(RainDropPanzer.siteOverrides[this.item.domain][overID]).html();
						this.item.excerpt = $(RainDropPanzer.siteOverrides[this.item.domain][overID]).text();

						this.item.type = 'article';
					}
					else
						this.item.type = 'link';

					this.done(doneCallback);
				break;
				default:
					var tempDoc = document.createElement('div');
						tempDoc.innerHTML = '<div>'+document.body.innerHTML+'</div>';

	    			//get images
					$('[src!=""]', tempDoc).each( function() {
						src = RainDropPanzer.helpers.parseUrl($(this).attr('src'));
						$(this).attr('src', src);
					} );

					//parse and save article
					var tempArticle=RainDropPanzer.grabArticle(tempDoc);
					if (tempArticle!=false){
						//is Article?
						if ((tempArticle.score>100)||(this.working.type=='article')) {
							this.item.type='article';
						}

						if (this.item.excerpt=='')
							this.item.excerpt=tempArticle.dom.innerText;
						this.item.html=tempArticle.dom.innerHTML;

						//get post images
						$('img', tempArticle.dom).each( function() {
							RainDropPanzer.working.media.push( $(this).attr('src') );
						} );
					}

					this.done(doneCallback);

					delete tempDoc;
				break;
			}
		},

		//Done, send data
		done: function(doneCallback) {
			if (this.working.media.length>0)
			{
				this.working.media = this.helpers.removeDublicates(this.working.media);
				for(var i in this.working.media){
					var temp=$('img[src="'+this.working.media[i]+'"]:eq(0)'),
						bigImg = (( temp.width()>=RainDropPanzer.minWidth )&&( temp.height()>=RainDropPanzer.minHeight )),
						canAdd = ((this.item.type=='image')||(this.item.type=='video')),
						notExists = (temp.length==0);

					if ( (bigImg)||(canAdd)||(notExists) ){
						var tempData = {type: 'image', link: this.helpers.parseUrl(this.working.media[i]), width: temp.width(), height: temp.height()};
						if ((tempData.width>0)&&(tempData.height>0)){
							tempData.coverHeight = (tempData.height/tempData.width).toFixed(2)
						}

						this.item.media.push( tempData );
					}
				}
			}
			this.item.coverEnabled=(this.item.media.length>0);
			this.item.title=this.helpers.truncate(
				this.helpers.collapseWhitespace( this.item.title.trim() ), 100
			);
			this.item.excerpt=this.helpers.truncate(
				this.helpers.collapseWhitespace( this.item.excerpt.trim() ), 100
			);
			this.item.result=true;

			doneCallback(this.item);
		},

		//Read meta tags
		prepareHTML: function() {
			var ogTypes = {
				'video' : ['video', 'video.movie', 'video.episode', 'video.tv_show', 'video.other', 'coub-com:coub', 'movie']
			};

	    	//meta tags
	    	var parseTag=function(s) {
	    		if (s!='og:type')
	    		{s=s.split(':'); s=s[ s.length-1 ];}
	    		return s;
	    	}
			$('meta[property^="og:"], meta[name^="og:"], meta[property^="twitter:"], meta[name^="twitter:"]').each( function() {
				var tag = '', value = '';
				if ($(this).attr('property')!=undefined)
					tag = parseTag( $(this).attr('property') );
				else if ($(this).attr('name')!=undefined)
					tag = parseTag( $(this).attr('name') );

				if (($(this).attr('content')!=undefined)&&($(this).attr('content')!=''))
					value = $(this).attr('content');
				else if (($(this).attr('value')!=undefined)&&($(this).attr('value')!=''))
					value = $(this).attr('value');

				if ((tag!='')&&(value!=''))
				{
					if (tag=='image'){
						if (RainDropPanzer.working.metaTags[ tag ]==undefined) RainDropPanzer.working.metaTags[ tag ]=[];
						RainDropPanzer.working.metaTags[ tag ].push(value);
					}
					else
						RainDropPanzer.working.metaTags[ tag ] = value;
				}
			} );

			if (RainDropPanzer.working.metaTags['title']!=undefined)
				RainDropPanzer.item.title = RainDropPanzer.working.metaTags['title'];

			if (RainDropPanzer.working.metaTags['description']!=undefined)
				RainDropPanzer.item.excerpt = RainDropPanzer.working.metaTags['description'];

			//check type
			if (RainDropPanzer.working.metaTags['og:type']!=undefined) {
				RainDropPanzer.working.type=RainDropPanzer.working.metaTags['og:type'];
				for (var i in ogTypes)
					for (var j in ogTypes[i])
						if (ogTypes[i][j] == RainDropPanzer.working.metaTags['og:type'])
							RainDropPanzer.item.type = i;
			}

			//preview
			if (RainDropPanzer.working.metaTags['image']!=undefined)
				RainDropPanzer.working.media=RainDropPanzer.working.metaTags['image'];

			//if video iframe
			if ((RainDropPanzer.working.metaTags['player']!=undefined)/*&&(RainDropPanzer.working.type=='video')*/)
				RainDropPanzer.item.type='video';

			//if html5 video
			if ((RainDropPanzer.working.metaTags['video']!=undefined)&&(RainDropPanzer.item.type=='video'))
				RainDropPanzer.working.html5video=true;

			//if photo card
			if ((RainDropPanzer.working.metaTags['card']=='photo') /*&& (RainDropPanzer.working.metaTags['width']!=undefined) && (RainDropPanzer.working.metaTags['height']!=undefined)*/ )
				RainDropPanzer.item.type='image';

			//is browser image preview
			if (( $('body > *').length == 1) && ( $('body > img').length == 1 )){
				this.working.metaTags['image'] = [$('body img:eq(0)').attr('src')];
				this.working.media = this.working.metaTags['image'];
				
				RainDropPanzer.item.type='image';
			}

			//site specific
			if (RainDropPanzer.siteOverrides[this.item.domain]!=undefined)
				this.item.type='specific';
		}
	};





	/************************    P A R S S E R ***********************/
	(function() {
		// All of the regular expressions in use within readability.
		var regexps = {
		  unlikelyCandidatesRe: /combx|comment|disqus|foot|header|menu|meta|nav|rss|shoutbox|sidebar|sponsor/i,
		  okMaybeItsACandidateRe: /and|article|body|column|main/i,
		  positiveRe: /article|body|content|entry|hentry|page|pagination|post|text/i,
		  negativeRe: /combx|comment|contact|foot|footer|footnote|link|media|meta|promo|related|scroll|shoutbox|sponsor|utility|tags|widget/i,
		  divToPElementsRe: /<(a|blockquote|dl|div|img|ol|p|pre|table|ul)/i,
		  replaceBrsRe: /(<br[^>]*>[ \n\r\t]*){2,}/gi,
		  replaceFontsRe: /<(\/?)font[^>]*>/gi,
		  trimRe: /^\s+|\s+$/g,
		  normalizeRe: /\s{2,}/g,
		  killBreaksRe: /(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,
		  videoRe: /http:\/\/(www\.)?(youtube|vimeo|youku|tudou|56|yinyuetai)\.com/i
		};

		var dbg=function(s){
		  //console.log(s);
		}


		/***
		 * grabArticle - Using a variety of metrics (content score, classname, element types), find the content that is
		 *               most likely to be the stuff a user wants to read. Then return it wrapped up in a div.
		 *document, 
		 * @return Element
		 **/
		RainDropPanzer.grabArticle = function (tempDoc,preserveUnlikelyCandidates) {
		  /**
		   * First, node prepping. Trash nodes that look cruddy (like ones with the class name "comment", etc), and turn divs
		   * into P tags where they have been used inappropriately (as in, where they contain no other block level elements.)
		   *
		   * Note: Assignment from index for performance. See http://www.peachpit.com/articles/article.aspx?p=31567&seqNum=5
		   * TODO: Shouldn't this be a reverse traversal?
		   **/
		  var nodes = $('*', tempDoc);
		  for (var i = 0; i < nodes.length; ++i) {
		    var node = nodes[i];
		    // Remove unlikely candidates */
		    var continueFlag = false;
		    if (!preserveUnlikelyCandidates) {
		      var unlikelyMatchString = node.className + node.id;
		      if (unlikelyMatchString.search(regexps.unlikelyCandidatesRe) !== -1 && unlikelyMatchString.search(regexps.okMaybeItsACandidateRe) == -1 && node.tagName !== "BODY") {
		        dbg("Removing unlikely candidate - " + unlikelyMatchString);
		        node.parentNode.removeChild(node);
		        continueFlag = true;
		      }
		    }

		    // Turn all divs that don't have children block level elements into p's
		    if (!continueFlag && node.tagName === "DIV") {
		      if (node.innerHTML.search(regexps.divToPElementsRe) === -1) {
		        dbg("Altering div to p");
		        var newNode = document.createElement('p');
		        newNode.innerHTML = node.innerHTML;
		        node.parentNode.replaceChild(newNode, node);
		      } else {
		        // EXPERIMENTAL
		        /*
		        node.childNodes._toArray().forEach(function (childNode) {
		          if (childNode.nodeType == 3 ) {
		            // use span instead of p. Need more tests.
		            dbg("replacing text node with a span tag with the same content.");
		            var span = document.createElement('span');
		            span.innerHTML = childNode.nodeValue;
		            childNode.parentNode.replaceChild(span, childNode);
		          }
		        });*/
		      }
		    }
		  }

		  /**
		   * Loop through all paragraphs, and assign a score to them based on how content-y they look.
		   * Then add their score to their parent node.
		   *
		   * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
		   **/
		  var allParagraphs = $("p", tempDoc);
		  var candidates = [];

		  for (var i = 0; i < allParagraphs.length; ++i) {
		    var paragraph = allParagraphs[i];
		    var parentNode = paragraph.parentNode;
		    var grandParentNode = parentNode.parentNode;
		    var innerText = getInnerText(paragraph);

		    // If this paragraph is less than 25 characters, don't even count it. 
		    if (innerText.length < 25) continue;

		    // Initialize readability data for the parent.
		    if (typeof parentNode.readability == 'undefined') {
		      initializeNode(parentNode);
		      candidates.push(parentNode);
		    }

		    // Initialize readability data for the grandparent.
		    if (typeof grandParentNode.readability == 'undefined') {
		      initializeNode(grandParentNode);
		      candidates.push(grandParentNode);
		    }

		    var contentScore = 0;

		    // Add a point for the paragraph itself as a base. */
		    ++contentScore;

		    // Add points for any commas within this paragraph */
		    // support Chinese commas.
		    contentScore += innerText.replace('，', ',').split(',').length;

		    // For every 100 characters in this paragraph, add another point. Up to 3 points. */
		    contentScore += Math.min(Math.floor(innerText.length / 100), 3);

		    // Add the score to the parent. The grandparent gets half. */
		    parentNode.readability.contentScore += contentScore;
		    grandParentNode.readability.contentScore += contentScore / 2;
		  }


		  /**
		   * After we've calculated scores, loop through all of the possible candidate nodes we found
		   * and find the one with the highest score.
		   **/
		  var topCandidate = null;
		  candidates.forEach(function (candidate) {
		    /**
		     * Scale the final candidates score based on link density. Good content should have a
		     * relatively small link density (5% or less) and be mostly unaffected by this operation.
		     **/
		    candidate.readability.contentScore = candidate.readability.contentScore * (1 - getLinkDensity(candidate));

		    dbg('Candidate: ' + candidate + " (" + candidate.className + ":" + candidate.id + ") with score " + candidate.readability.contentScore);

		    if (!topCandidate || candidate.readability.contentScore > topCandidate.readability.contentScore) topCandidate = candidate;
		  });

		  /**
		   * If we still have no top candidate, just use the body as a last resort.
		   * We also have to copy the body node so it is something we can modify.
		   **/
		  if (topCandidate === null || topCandidate.tagName === "BODY") {
		    /*topCandidate = document.createElement("DIV");
		    topCandidate.innerHTML = document.body.innerHTML;
		    document.body.innerHTML = "";
		    document.body.appendChild(topCandidate);
		    initializeNode(topCandidate);*/
		    return false;
		  }


		  /**
		   * Now that we have the top candidate, look through its siblings for content that might also be related.
		   * Things like preambles, content split by ads that we removed, etc.
		   **/
		  var articleContent = document.createElement("DIV");
		  articleContent.id = "readability-content";
		  var siblingScoreThreshold = Math.max(10, topCandidate.readability.contentScore * 0.2);
		  var siblingNodes = topCandidate.parentNode.childNodes;
		  for (var i = 0, il = siblingNodes.length; i < il; i++) {
		    var siblingNode = siblingNodes[i];
		    var append = false;

		    dbg("Looking at sibling node: " + siblingNode + " (" + siblingNode.className + ":" + siblingNode.id + ")" + ((typeof siblingNode.readability != 'undefined') ? (" with score " + siblingNode.readability.contentScore) : ''));
		    dbg("Sibling has score " + (siblingNode.readability ? siblingNode.readability.contentScore : 'Unknown'));

		    if (siblingNode === topCandidate) {
		      append = true;
		    }

		    if (typeof siblingNode.readability != 'undefined' && siblingNode.readability.contentScore >= siblingScoreThreshold) {
		      append = true;
		    }

		    if (siblingNode.nodeName == "P") {
		      var linkDensity = getLinkDensity(siblingNode);
		      var nodeContent = getInnerText(siblingNode);
		      var nodeLength = nodeContent.length;

		      if (nodeLength > 80 && linkDensity < 0.25) {
		        append = true;
		      } else if (nodeLength < 80 && linkDensity == 0 && nodeContent.search(/\.( |$)/) !== -1) {
		        append = true;
		      }
		    }

		    if (append) {
		      dbg("Appending node: " + siblingNode)

		      /* Append sibling and subtract from our list because it removes the node when you append to another node */
		      articleContent.appendChild(siblingNode);
		      i--;
		      il--;
		    }
		  }

		  /**
		   * So we have all of the content that we need. Now we clean it up for presentation.
		   **/
		  prepArticle(articleContent);

		    return {
		        dom:    articleContent,
		        score:  topCandidate.readability.contentScore
		    };
		};



		/**
		 * Remove the style attribute on every e and under.
		 *
		 * @param Element
		 * @return void
		 **/
		function cleanStyles (e) {
		  if (!e) return;


		  // Remove any root styles, if we're able.
		  if (typeof e.removeAttribute == 'function' && e.className != 'readability-styled') e.removeAttribute('style');

		  // Go until there are no more child nodes
		  var cur = e.firstChild;
		  while (cur) {
		    if (cur.nodeType == 1) {
		      // Remove style attribute(s) :
		      if (cur.className != "readability-styled") {
		        cur.removeAttribute("style");
		      }
		      cleanStyles(cur);
		    }
		    cur = cur.nextSibling;
		  }
		}

		/**
		 * Remove extraneous break tags from a node.
		 *
		 * @param Element
		 * @return void
		 **/
		function killBreaks (e) {
		  e.innerHTML = e.innerHTML.replace(regexps.killBreaksRe, '<br />');
		}


		/**
		 * Get the inner text of a node - cross browser compatibly.
		 * This also strips out any excess whitespace to be found.
		 *
		 * @param Element
		 * @return string
		 **/
		getInnerText = function (e, normalizeSpaces) {
		  var textContent = "";

		  normalizeSpaces = (typeof normalizeSpaces == 'undefined') ? true : normalizeSpaces;

		  textContent = e.textContent.trim();

		  if (normalizeSpaces) return textContent.replace(regexps.normalizeRe, " ");
		  else return textContent;
		}

		/**
		 * Get the number of times a string s appears in the node e.
		 *
		 * @param Element
		 * @param string - what to split on. Default is ","
		 * @return number (integer)
		 **/
		function getCharCount (e, s) {
		  s = s || ",";
		  return getInnerText(e).split(s).length;
		}

		/**
		 * Get the density of links as a percentage of the content
		 * This is the amount of text that is inside a link divided by the total text in the node.
		 * 
		 * @param Element
		 * @return number (float)
		 **/
		function getLinkDensity (e) {
		  var links = e.getElementsByTagName("a");

		  var textLength = getInnerText(e).length;
		  var linkLength = 0;
		  for (var i = 0, il = links.length; i < il; i++) {
		    var href = links[i].getAttribute('href');
		    // hack for <h2><a href="#menu"></a></h2> / <h2><a></a></h2>
		    if(!href || (href.length > 0 && href[0] === '#')) continue;
		    linkLength += getInnerText(links[i]).length;
		  }
		  return linkLength / textLength;
		}

		/**
		 * Get an elements class/id weight. Uses regular expressions to tell if this 
		 * element looks good or bad.
		 *
		 * @param Element
		 * @return number (Integer)
		 **/
		function getClassWeight (e) {
		  var weight = 0;

		  /* Look for a special classname */
		  if (e.className != "") {
		    if (e.className.search(regexps.negativeRe) !== -1) weight -= 25;

		    if (e.className.search(regexps.positiveRe) !== -1) weight += 25;
		  }

		  /* Look for a special ID */
		  if (typeof (e.id) == 'string' && e.id != "") {
		    if (e.id.search(regexps.negativeRe) !== -1) weight -= 25;

		    if (e.id.search(regexps.positiveRe) !== -1) weight += 25;
		  }

		  return weight;
		}

		/**
		 * Clean a node of all elements of type "tag".
		 * (Unless it's a youtube/vimeo video. People love movies.)
		 *
		 * @param Element
		 * @param string tag to clean
		 * @return void
		 **/
		function clean (e, tag) {
		    $(tag,e).remove();
		}

		/**
		 * Clean an element of all tags of type "tag" if they look fishy.
		 * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
		 *
		 * @return void
		 **/
		function cleanConditionally(e, tag) {
		  var tagsList = e.getElementsByTagName(tag);
		  var curTagsLength = tagsList.length;

		  /**
		   * Gather counts for other typical elements embedded within.
		   * Traverse backwards so we can remove nodes at the same time without effecting the traversal.
		   *
		   * TODO: Consider taking into account original contentScore here.
		   **/
		  for (var i = curTagsLength - 1; i >= 0; i--) {
		    var weight = getClassWeight(tagsList[i]);

		    dbg("Cleaning Conditionally " + tagsList[i] + " (" + tagsList[i].className + ":" + tagsList[i].id + ")" + ((typeof tagsList[i].readability != 'undefined') ? (" with score " + tagsList[i].readability.contentScore) : ''));

		    if (weight < 0) {
		      tagsList[i].parentNode.removeChild(tagsList[i]);
		    } else if (getCharCount(tagsList[i], ',') < 10) {
		      /**
		       * If there are not very many commas, and the number of
		       * non-paragraph elements is more than paragraphs or other ominous signs, remove the element.
		       **/

		      var p = tagsList[i].getElementsByTagName("p").length;
		      var img = tagsList[i].getElementsByTagName("img").length;
		      var li = tagsList[i].getElementsByTagName("li").length - 100;
		      var input = tagsList[i].getElementsByTagName("input").length;

		      var embedCount = 0;
		      var embeds = tagsList[i].getElementsByTagName("embed");
		      for (var ei = 0, il = embeds.length; ei < il; ei++) {
		        if (embeds[ei].src && embeds[ei].src.search(regexps.videoRe) == -1) {
		          embedCount++;
		        }
		      }

		      var linkDensity = getLinkDensity(tagsList[i]);
		      var contentLength = getInnerText(tagsList[i]).length;
		      var toRemove = false;

		      if (img > p && img > 1) {
		        toRemove = true;
		      } else if (li > p && tag != "ul" && tag != "ol") {
		        toRemove = true;
		      } else if (input > Math.floor(p / 3)) {
		        toRemove = true;
		      } else if (contentLength < 25 && (img == 0 || img > 2)) {
		        toRemove = true;
		      } else if (weight < 25 && linkDensity > .2) {
		        toRemove = true;
		      } else if (weight >= 25 && linkDensity > .5) {
		        toRemove = true;
		      } else if ((embedCount == 1 && contentLength < 75) || embedCount > 1) {
		        toRemove = true;
		      }

		      if (toRemove) {
		        tagsList[i].parentNode.removeChild(tagsList[i]);
		      }
		    }
		  }
		}

		/**
		 * Clean out spurious headers from an Element. Checks things like classnames and link density.
		 *
		 * @param Element
		 * @return void
		 **/
		function cleanHeaders (e) {
		  for (var headerIndex = 1; headerIndex < 7; headerIndex++) {
		    var headers = e.getElementsByTagName('h' + headerIndex);
		    for (var i = headers.length - 1; i >= 0; --i) {
		      if (getClassWeight(headers[i]) < 0 || getLinkDensity(headers[i]) > 0.33) {
		        headers[i].parentNode.removeChild(headers[i]);
		      }
		    }
		  }
		}

		/**
		 * Remove the header that doesn't have next sibling.
		 *
		 * @param Element
		 * @return void
		 **/

		function cleanSingleHeader (e) {
		  for (var headerIndex = 1; headerIndex < 7; headerIndex++) {
		    var headers = e.getElementsByTagName('h' + headerIndex);
		    for (var i = headers.length - 1; i >= 0; --i) {
		      if (headers[i].nextSibling === null) {
		        headers[i].parentNode.removeChild(headers[i]);
		      }
		    }
		  }

		}



		function prepArticle (articleContent) {
		  cleanStyles(articleContent);
		  killBreaks(articleContent);

		  /* Clean out junk from the article content */
		  clean(articleContent, "form");
		  clean(articleContent, "object");
		  clean(articleContent, "h1");
		  clean(articleContent, "style");
		  clean(articleContent, "script");
		  /**
		   * If there is only one h2, they are probably using it
		   * as a header and not a subheader, so remove it since we already have a header.
		   ***/
		  if (articleContent.getElementsByTagName('h2').length == 1) clean(articleContent, "h2");

		  clean(articleContent, "iframe:not([src*='youtube.com/'],[src*='vimeo.com/'])");

		  cleanHeaders(articleContent);

		  /* Do these last as the previous stuff may have removed junk that will affect these */
		  cleanConditionally(articleContent, "table");
		  cleanConditionally(articleContent, "ul");
		  cleanConditionally(articleContent, "div");

		  /* Remove extra paragraphs */
		  var articleParagraphs = articleContent.getElementsByTagName('p');
		  for (var i = articleParagraphs.length - 1; i >= 0; i--) {
		    var imgCount = articleParagraphs[i].getElementsByTagName('img').length;
		    var embedCount = articleParagraphs[i].getElementsByTagName('embed').length;
		    var objectCount = articleParagraphs[i].getElementsByTagName('object').length;
		    var iframeCount = articleParagraphs[i].getElementsByTagName('iframe').length;

		    if (imgCount == 0 && embedCount == 0 && objectCount == 0 && iframeCount == 0 && getInnerText(articleParagraphs[i], false) == '') {
		      articleParagraphs[i].parentNode.removeChild(articleParagraphs[i]);
		    }
		  }

		  cleanSingleHeader(articleContent);

		  try {
		    articleContent.innerHTML = articleContent.innerHTML.replace(/<br[^>]*>\s*<p/gi, '<p');
		  } catch (e) {
		    dbg("Cleaning innerHTML of breaks failed. This is an IE strict-block-elements bug. Ignoring.");
		  }

		}



		/**
		 * Initialize a node with the readability object. Also checks the
		 * className/id for special names to add to its score.
		 *
		 * @param Element
		 * @return void
		 **/
		function initializeNode (node) {
		  node.readability = {
		    "contentScore": 0
		  };

		  switch (node.tagName) {
		  case 'DIV':
		    node.readability.contentScore += 5;
		    break;

		  case 'PRE':
		  case 'TD':
		  case 'BLOCKQUOTE':
		    node.readability.contentScore += 3;
		    break;

		  case 'ADDRESS':
		  case 'OL':
		  case 'UL':
		  case 'DL':
		  case 'DD':
		  case 'DT':
		  case 'LI':
		  case 'FORM':
		    node.readability.contentScore -= 3;
		    break;

		  case 'H1':
		  case 'H2':
		  case 'H3':
		  case 'H4':
		  case 'H5':
		  case 'H6':
		  case 'TH':
		    node.readability.contentScore -= 5;
		    break;
		  }

		  node.readability.contentScore += getClassWeight(node);
		}
	})();
}