import{a as Ae,q as ln,c as fn}from"./disclose-version.Cv0DRzEZ.js";import"./legacy.C5WEQ8CC.js";import{p as ke,c as cn,r as un,t as dn,a as we,a8 as mn,f as gn,m as pn,g as Xt}from"./runtime.BJvmUhqp.js";import{i as hn}from"./if.Bwpi0SWl.js";import{i as Pe}from"./lifecycle.wnX_UMhn.js";import{p,l as Vt,s as bn}from"./props.Ya8JvluK.js";import{h as yn}from"./html.DBD8mdzV.js";import{a as vn}from"./attributes.D1PqseF0.js";import{b as xn}from"./5.CL5QIiz_.js";function An(t){const{beat:e,fade:n,beatFade:a,bounce:r,shake:i,flash:s,spin:o,spinPulse:d,spinReverse:c,pulse:u,fixedWidth:g,inverse:m,border:v,listItem:S,flip:k,size:b,rotation:x,pull:h}=t,A={"fa-beat":e,"fa-fade":n,"fa-beat-fade":a,"fa-bounce":r,"fa-shake":i,"fa-flash":s,"fa-spin":o,"fa-spin-reverse":c,"fa-spin-pulse":d,"fa-pulse":u,"fa-fw":g,"fa-inverse":m,"fa-border":v,"fa-li":S,"fa-flip":k===!0,"fa-flip-horizontal":k==="horizontal"||k==="both","fa-flip-vertical":k==="vertical"||k==="both",[`fa-${b}`]:typeof b<"u"&&b!==null,[`fa-rotate-${x}`]:typeof x<"u"&&x!==null&&x!==0,[`fa-pull-${h}`]:typeof h<"u"&&h!==null,"fa-swap-opacity":t.swapOpacity};return Object.keys(A).map(w=>A[w]?w:null).filter(w=>w)}function kn(t){return t=t-0,t===t}function wn(t){return kn(t)?t:(t=t.replace(/[\-_\s]+(.)?/g,function(e,n){return n?n.toUpperCase():""}),t.substr(0,1).toLowerCase()+t.substr(1))}function Pn(t){return typeof t=="string"?t:Object.keys(t).reduce((e,n)=>e+n.split(/(?=[A-Z])/).join("-").toLowerCase()+":"+t[n]+";","")}function Se(t,e,n={}){if(typeof e=="string")return e;const a=(e.children||[]).map(i=>Se(t,i)),r=Object.keys(e.attributes||{}).reduce((i,s)=>{const o=e.attributes[s];return s==="style"?i.attrs.style=Pn(o):s.indexOf("aria-")===0||s.indexOf("data-")===0?i.attrs[s.toLowerCase()]=o:i.attrs[wn(s)]=o,i},{attrs:{}});return t(e.tag,{...r.attrs},a)}/*!
 * Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com
 * License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)
 * Copyright 2024 Fonticons, Inc.
 */function Sn(t,e,n){return(e=On(e))in t?Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}):t[e]=n,t}function Bt(t,e){var n=Object.keys(t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(t);e&&(a=a.filter(function(r){return Object.getOwnPropertyDescriptor(t,r).enumerable})),n.push.apply(n,a)}return n}function l(t){for(var e=1;e<arguments.length;e++){var n=arguments[e]!=null?arguments[e]:{};e%2?Bt(Object(n),!0).forEach(function(a){Sn(t,a,n[a])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):Bt(Object(n)).forEach(function(a){Object.defineProperty(t,a,Object.getOwnPropertyDescriptor(n,a))})}return t}function En(t,e){if(typeof t!="object"||!t)return t;var n=t[Symbol.toPrimitive];if(n!==void 0){var a=n.call(t,e||"default");if(typeof a!="object")return a;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}function On(t){var e=En(t,"string");return typeof e=="symbol"?e:e+""}const qt=()=>{};let Mt={},Ee={},Oe=null,Ie={mark:qt,measure:qt};try{typeof window<"u"&&(Mt=window),typeof document<"u"&&(Ee=document),typeof MutationObserver<"u"&&(Oe=MutationObserver),typeof performance<"u"&&(Ie=performance)}catch{}const{userAgent:Kt=""}=Mt.navigator||{},M=Mt,y=Ee,Qt=Oe,$=Ie;M.document;const _=!!y.documentElement&&!!y.head&&typeof y.addEventListener=="function"&&typeof y.createElement=="function",Ce=~Kt.indexOf("MSIE")||~Kt.indexOf("Trident/");var In=/fa(s|r|l|t|d|dr|dl|dt|b|k|kd|ss|sr|sl|st|sds|sdr|sdl|sdt)?[\-\ ]/,Cn=/Font ?Awesome ?([56 ]*)(Solid|Regular|Light|Thin|Duotone|Brands|Free|Pro|Sharp Duotone|Sharp|Kit)?.*/i,Ne={classic:{fa:"solid",fas:"solid","fa-solid":"solid",far:"regular","fa-regular":"regular",fal:"light","fa-light":"light",fat:"thin","fa-thin":"thin",fab:"brands","fa-brands":"brands"},duotone:{fa:"solid",fad:"solid","fa-solid":"solid","fa-duotone":"solid",fadr:"regular","fa-regular":"regular",fadl:"light","fa-light":"light",fadt:"thin","fa-thin":"thin"},sharp:{fa:"solid",fass:"solid","fa-solid":"solid",fasr:"regular","fa-regular":"regular",fasl:"light","fa-light":"light",fast:"thin","fa-thin":"thin"},"sharp-duotone":{fa:"solid",fasds:"solid","fa-solid":"solid",fasdr:"regular","fa-regular":"regular",fasdl:"light","fa-light":"light",fasdt:"thin","fa-thin":"thin"}},Nn={GROUP:"duotone-group",SWAP_OPACITY:"swap-opacity",PRIMARY:"primary",SECONDARY:"secondary"},_e=["fa-classic","fa-duotone","fa-sharp","fa-sharp-duotone"],P="classic",it="duotone",_n="sharp",Tn="sharp-duotone",Te=[P,it,_n,Tn],Fn={classic:{900:"fas",400:"far",normal:"far",300:"fal",100:"fat"},duotone:{900:"fad",400:"fadr",300:"fadl",100:"fadt"},sharp:{900:"fass",400:"fasr",300:"fasl",100:"fast"},"sharp-duotone":{900:"fasds",400:"fasdr",300:"fasdl",100:"fasdt"}},Mn={"Font Awesome 6 Free":{900:"fas",400:"far"},"Font Awesome 6 Pro":{900:"fas",400:"far",normal:"far",300:"fal",100:"fat"},"Font Awesome 6 Brands":{400:"fab",normal:"fab"},"Font Awesome 6 Duotone":{900:"fad",400:"fadr",normal:"fadr",300:"fadl",100:"fadt"},"Font Awesome 6 Sharp":{900:"fass",400:"fasr",normal:"fasr",300:"fasl",100:"fast"},"Font Awesome 6 Sharp Duotone":{900:"fasds",400:"fasdr",normal:"fasdr",300:"fasdl",100:"fasdt"}},Ln=new Map([["classic",{defaultShortPrefixId:"fas",defaultStyleId:"solid",styleIds:["solid","regular","light","thin","brands"],futureStyleIds:[],defaultFontWeight:900}],["sharp",{defaultShortPrefixId:"fass",defaultStyleId:"solid",styleIds:["solid","regular","light","thin"],futureStyleIds:[],defaultFontWeight:900}],["duotone",{defaultShortPrefixId:"fad",defaultStyleId:"solid",styleIds:["solid","regular","light","thin"],futureStyleIds:[],defaultFontWeight:900}],["sharp-duotone",{defaultShortPrefixId:"fasds",defaultStyleId:"solid",styleIds:["solid","regular","light","thin"],futureStyleIds:[],defaultFontWeight:900}]]),Rn={classic:{solid:"fas",regular:"far",light:"fal",thin:"fat",brands:"fab"},duotone:{solid:"fad",regular:"fadr",light:"fadl",thin:"fadt"},sharp:{solid:"fass",regular:"fasr",light:"fasl",thin:"fast"},"sharp-duotone":{solid:"fasds",regular:"fasdr",light:"fasdl",thin:"fasdt"}},Dn=["fak","fa-kit","fakd","fa-kit-duotone"],Zt={kit:{fak:"kit","fa-kit":"kit"},"kit-duotone":{fakd:"kit-duotone","fa-kit-duotone":"kit-duotone"}},zn=["kit"],jn={kit:{"fa-kit":"fak"},"kit-duotone":{"fa-kit-duotone":"fakd"}},Yn=["fak","fakd"],Un={kit:{fak:"fa-kit"},"kit-duotone":{fakd:"fa-kit-duotone"}},Jt={kit:{kit:"fak"},"kit-duotone":{"kit-duotone":"fakd"}},tt={GROUP:"duotone-group",SWAP_OPACITY:"swap-opacity",PRIMARY:"primary",SECONDARY:"secondary"},Wn=["fa-classic","fa-duotone","fa-sharp","fa-sharp-duotone"],Hn=["fak","fa-kit","fakd","fa-kit-duotone"],Gn={"Font Awesome Kit":{400:"fak",normal:"fak"},"Font Awesome Kit Duotone":{400:"fakd",normal:"fakd"}},Xn={classic:{"fa-brands":"fab","fa-duotone":"fad","fa-light":"fal","fa-regular":"far","fa-solid":"fas","fa-thin":"fat"},duotone:{"fa-regular":"fadr","fa-light":"fadl","fa-thin":"fadt"},sharp:{"fa-solid":"fass","fa-regular":"fasr","fa-light":"fasl","fa-thin":"fast"},"sharp-duotone":{"fa-solid":"fasds","fa-regular":"fasdr","fa-light":"fasdl","fa-thin":"fasdt"}},Vn={classic:["fas","far","fal","fat","fad"],duotone:["fadr","fadl","fadt"],sharp:["fass","fasr","fasl","fast"],"sharp-duotone":["fasds","fasdr","fasdl","fasdt"]},bt={classic:{fab:"fa-brands",fad:"fa-duotone",fal:"fa-light",far:"fa-regular",fas:"fa-solid",fat:"fa-thin"},duotone:{fadr:"fa-regular",fadl:"fa-light",fadt:"fa-thin"},sharp:{fass:"fa-solid",fasr:"fa-regular",fasl:"fa-light",fast:"fa-thin"},"sharp-duotone":{fasds:"fa-solid",fasdr:"fa-regular",fasdl:"fa-light",fasdt:"fa-thin"}},Bn=["fa-solid","fa-regular","fa-light","fa-thin","fa-duotone","fa-brands"],yt=["fa","fas","far","fal","fat","fad","fadr","fadl","fadt","fab","fass","fasr","fasl","fast","fasds","fasdr","fasdl","fasdt",...Wn,...Bn],qn=["solid","regular","light","thin","duotone","brands"],Fe=[1,2,3,4,5,6,7,8,9,10],Kn=Fe.concat([11,12,13,14,15,16,17,18,19,20]),Qn=[...Object.keys(Vn),...qn,"2xs","xs","sm","lg","xl","2xl","beat","border","fade","beat-fade","bounce","flip-both","flip-horizontal","flip-vertical","flip","fw","inverse","layers-counter","layers-text","layers","li","pull-left","pull-right","pulse","rotate-180","rotate-270","rotate-90","rotate-by","shake","spin-pulse","spin-reverse","spin","stack-1x","stack-2x","stack","ul",tt.GROUP,tt.SWAP_OPACITY,tt.PRIMARY,tt.SECONDARY].concat(Fe.map(t=>"".concat(t,"x"))).concat(Kn.map(t=>"w-".concat(t))),Zn={"Font Awesome 5 Free":{900:"fas",400:"far"},"Font Awesome 5 Pro":{900:"fas",400:"far",normal:"far",300:"fal"},"Font Awesome 5 Brands":{400:"fab",normal:"fab"},"Font Awesome 5 Duotone":{900:"fad"}};const C="___FONT_AWESOME___",vt=16,Me="fa",Le="svg-inline--fa",Y="data-fa-i2svg",xt="data-fa-pseudo-element",Jn="data-fa-pseudo-element-pending",Lt="data-prefix",Rt="data-icon",$t="fontawesome-i2svg",$n="async",ta=["HTML","HEAD","STYLE","SCRIPT"],Re=(()=>{try{return!0}catch{return!1}})();function Z(t){return new Proxy(t,{get(e,n){return n in e?e[n]:e[P]}})}const De=l({},Ne);De[P]=l(l(l(l({},{"fa-duotone":"duotone"}),Ne[P]),Zt.kit),Zt["kit-duotone"]);const ea=Z(De),At=l({},Rn);At[P]=l(l(l(l({},{duotone:"fad"}),At[P]),Jt.kit),Jt["kit-duotone"]);const te=Z(At),kt=l({},bt);kt[P]=l(l({},kt[P]),Un.kit);const Dt=Z(kt),wt=l({},Xn);wt[P]=l(l({},wt[P]),jn.kit);Z(wt);const na=In,ze="fa-layers-text",aa=Cn,ra=l({},Fn);Z(ra);const ia=["class","data-prefix","data-icon","data-fa-transform","data-fa-mask"],ut=Nn,sa=[...zn,...Qn],B=M.FontAwesomeConfig||{};function oa(t){var e=y.querySelector("script["+t+"]");if(e)return e.getAttribute(t)}function la(t){return t===""?!0:t==="false"?!1:t==="true"?!0:t}y&&typeof y.querySelector=="function"&&[["data-family-prefix","familyPrefix"],["data-css-prefix","cssPrefix"],["data-family-default","familyDefault"],["data-style-default","styleDefault"],["data-replacement-class","replacementClass"],["data-auto-replace-svg","autoReplaceSvg"],["data-auto-add-css","autoAddCss"],["data-auto-a11y","autoA11y"],["data-search-pseudo-elements","searchPseudoElements"],["data-observe-mutations","observeMutations"],["data-mutate-approach","mutateApproach"],["data-keep-original-source","keepOriginalSource"],["data-measure-performance","measurePerformance"],["data-show-missing-icons","showMissingIcons"]].forEach(e=>{let[n,a]=e;const r=la(oa(n));r!=null&&(B[a]=r)});const je={styleDefault:"solid",familyDefault:P,cssPrefix:Me,replacementClass:Le,autoReplaceSvg:!0,autoAddCss:!0,autoA11y:!0,searchPseudoElements:!1,observeMutations:!0,mutateApproach:"async",keepOriginalSource:!0,measurePerformance:!1,showMissingIcons:!0};B.familyPrefix&&(B.cssPrefix=B.familyPrefix);const G=l(l({},je),B);G.autoReplaceSvg||(G.observeMutations=!1);const f={};Object.keys(je).forEach(t=>{Object.defineProperty(f,t,{enumerable:!0,set:function(e){G[t]=e,q.forEach(n=>n(f))},get:function(){return G[t]}})});Object.defineProperty(f,"familyPrefix",{enumerable:!0,set:function(t){G.cssPrefix=t,q.forEach(e=>e(f))},get:function(){return G.cssPrefix}});M.FontAwesomeConfig=f;const q=[];function fa(t){return q.push(t),()=>{q.splice(q.indexOf(t),1)}}const F=vt,O={size:16,x:0,y:0,rotate:0,flipX:!1,flipY:!1};function ca(t){if(!t||!_)return;const e=y.createElement("style");e.setAttribute("type","text/css"),e.innerHTML=t;const n=y.head.childNodes;let a=null;for(let r=n.length-1;r>-1;r--){const i=n[r],s=(i.tagName||"").toUpperCase();["STYLE","LINK"].indexOf(s)>-1&&(a=i)}return y.head.insertBefore(e,a),t}const ua="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";function K(){let t=12,e="";for(;t-- >0;)e+=ua[Math.random()*62|0];return e}function X(t){const e=[];for(let n=(t||[]).length>>>0;n--;)e[n]=t[n];return e}function zt(t){return t.classList?X(t.classList):(t.getAttribute("class")||"").split(" ").filter(e=>e)}function Ye(t){return"".concat(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function da(t){return Object.keys(t||{}).reduce((e,n)=>e+"".concat(n,'="').concat(Ye(t[n]),'" '),"").trim()}function st(t){return Object.keys(t||{}).reduce((e,n)=>e+"".concat(n,": ").concat(t[n].trim(),";"),"")}function jt(t){return t.size!==O.size||t.x!==O.x||t.y!==O.y||t.rotate!==O.rotate||t.flipX||t.flipY}function ma(t){let{transform:e,containerWidth:n,iconWidth:a}=t;const r={transform:"translate(".concat(n/2," 256)")},i="translate(".concat(e.x*32,", ").concat(e.y*32,") "),s="scale(".concat(e.size/16*(e.flipX?-1:1),", ").concat(e.size/16*(e.flipY?-1:1),") "),o="rotate(".concat(e.rotate," 0 0)"),d={transform:"".concat(i," ").concat(s," ").concat(o)},c={transform:"translate(".concat(a/2*-1," -256)")};return{outer:r,inner:d,path:c}}function ga(t){let{transform:e,width:n=vt,height:a=vt,startCentered:r=!1}=t,i="";return r&&Ce?i+="translate(".concat(e.x/F-n/2,"em, ").concat(e.y/F-a/2,"em) "):r?i+="translate(calc(-50% + ".concat(e.x/F,"em), calc(-50% + ").concat(e.y/F,"em)) "):i+="translate(".concat(e.x/F,"em, ").concat(e.y/F,"em) "),i+="scale(".concat(e.size/F*(e.flipX?-1:1),", ").concat(e.size/F*(e.flipY?-1:1),") "),i+="rotate(".concat(e.rotate,"deg) "),i}var pa=`:root, :host {
  --fa-font-solid: normal 900 1em/1 "Font Awesome 6 Free";
  --fa-font-regular: normal 400 1em/1 "Font Awesome 6 Free";
  --fa-font-light: normal 300 1em/1 "Font Awesome 6 Pro";
  --fa-font-thin: normal 100 1em/1 "Font Awesome 6 Pro";
  --fa-font-duotone: normal 900 1em/1 "Font Awesome 6 Duotone";
  --fa-font-duotone-regular: normal 400 1em/1 "Font Awesome 6 Duotone";
  --fa-font-duotone-light: normal 300 1em/1 "Font Awesome 6 Duotone";
  --fa-font-duotone-thin: normal 100 1em/1 "Font Awesome 6 Duotone";
  --fa-font-brands: normal 400 1em/1 "Font Awesome 6 Brands";
  --fa-font-sharp-solid: normal 900 1em/1 "Font Awesome 6 Sharp";
  --fa-font-sharp-regular: normal 400 1em/1 "Font Awesome 6 Sharp";
  --fa-font-sharp-light: normal 300 1em/1 "Font Awesome 6 Sharp";
  --fa-font-sharp-thin: normal 100 1em/1 "Font Awesome 6 Sharp";
  --fa-font-sharp-duotone-solid: normal 900 1em/1 "Font Awesome 6 Sharp Duotone";
  --fa-font-sharp-duotone-regular: normal 400 1em/1 "Font Awesome 6 Sharp Duotone";
  --fa-font-sharp-duotone-light: normal 300 1em/1 "Font Awesome 6 Sharp Duotone";
  --fa-font-sharp-duotone-thin: normal 100 1em/1 "Font Awesome 6 Sharp Duotone";
}

svg:not(:root).svg-inline--fa, svg:not(:host).svg-inline--fa {
  overflow: visible;
  box-sizing: content-box;
}

.svg-inline--fa {
  display: var(--fa-display, inline-block);
  height: 1em;
  overflow: visible;
  vertical-align: -0.125em;
}
.svg-inline--fa.fa-2xs {
  vertical-align: 0.1em;
}
.svg-inline--fa.fa-xs {
  vertical-align: 0em;
}
.svg-inline--fa.fa-sm {
  vertical-align: -0.0714285705em;
}
.svg-inline--fa.fa-lg {
  vertical-align: -0.2em;
}
.svg-inline--fa.fa-xl {
  vertical-align: -0.25em;
}
.svg-inline--fa.fa-2xl {
  vertical-align: -0.3125em;
}
.svg-inline--fa.fa-pull-left {
  margin-right: var(--fa-pull-margin, 0.3em);
  width: auto;
}
.svg-inline--fa.fa-pull-right {
  margin-left: var(--fa-pull-margin, 0.3em);
  width: auto;
}
.svg-inline--fa.fa-li {
  width: var(--fa-li-width, 2em);
  top: 0.25em;
}
.svg-inline--fa.fa-fw {
  width: var(--fa-fw-width, 1.25em);
}

.fa-layers svg.svg-inline--fa {
  bottom: 0;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 0;
}

.fa-layers-counter, .fa-layers-text {
  display: inline-block;
  position: absolute;
  text-align: center;
}

.fa-layers {
  display: inline-block;
  height: 1em;
  position: relative;
  text-align: center;
  vertical-align: -0.125em;
  width: 1em;
}
.fa-layers svg.svg-inline--fa {
  transform-origin: center center;
}

.fa-layers-text {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  transform-origin: center center;
}

.fa-layers-counter {
  background-color: var(--fa-counter-background-color, #ff253a);
  border-radius: var(--fa-counter-border-radius, 1em);
  box-sizing: border-box;
  color: var(--fa-inverse, #fff);
  line-height: var(--fa-counter-line-height, 1);
  max-width: var(--fa-counter-max-width, 5em);
  min-width: var(--fa-counter-min-width, 1.5em);
  overflow: hidden;
  padding: var(--fa-counter-padding, 0.25em 0.5em);
  right: var(--fa-right, 0);
  text-overflow: ellipsis;
  top: var(--fa-top, 0);
  transform: scale(var(--fa-counter-scale, 0.25));
  transform-origin: top right;
}

.fa-layers-bottom-right {
  bottom: var(--fa-bottom, 0);
  right: var(--fa-right, 0);
  top: auto;
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: bottom right;
}

.fa-layers-bottom-left {
  bottom: var(--fa-bottom, 0);
  left: var(--fa-left, 0);
  right: auto;
  top: auto;
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: bottom left;
}

.fa-layers-top-right {
  top: var(--fa-top, 0);
  right: var(--fa-right, 0);
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: top right;
}

.fa-layers-top-left {
  left: var(--fa-left, 0);
  right: auto;
  top: var(--fa-top, 0);
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: top left;
}

.fa-1x {
  font-size: 1em;
}

.fa-2x {
  font-size: 2em;
}

.fa-3x {
  font-size: 3em;
}

.fa-4x {
  font-size: 4em;
}

.fa-5x {
  font-size: 5em;
}

.fa-6x {
  font-size: 6em;
}

.fa-7x {
  font-size: 7em;
}

.fa-8x {
  font-size: 8em;
}

.fa-9x {
  font-size: 9em;
}

.fa-10x {
  font-size: 10em;
}

.fa-2xs {
  font-size: 0.625em;
  line-height: 0.1em;
  vertical-align: 0.225em;
}

.fa-xs {
  font-size: 0.75em;
  line-height: 0.0833333337em;
  vertical-align: 0.125em;
}

.fa-sm {
  font-size: 0.875em;
  line-height: 0.0714285718em;
  vertical-align: 0.0535714295em;
}

.fa-lg {
  font-size: 1.25em;
  line-height: 0.05em;
  vertical-align: -0.075em;
}

.fa-xl {
  font-size: 1.5em;
  line-height: 0.0416666682em;
  vertical-align: -0.125em;
}

.fa-2xl {
  font-size: 2em;
  line-height: 0.03125em;
  vertical-align: -0.1875em;
}

.fa-fw {
  text-align: center;
  width: 1.25em;
}

.fa-ul {
  list-style-type: none;
  margin-left: var(--fa-li-margin, 2.5em);
  padding-left: 0;
}
.fa-ul > li {
  position: relative;
}

.fa-li {
  left: calc(-1 * var(--fa-li-width, 2em));
  position: absolute;
  text-align: center;
  width: var(--fa-li-width, 2em);
  line-height: inherit;
}

.fa-border {
  border-color: var(--fa-border-color, #eee);
  border-radius: var(--fa-border-radius, 0.1em);
  border-style: var(--fa-border-style, solid);
  border-width: var(--fa-border-width, 0.08em);
  padding: var(--fa-border-padding, 0.2em 0.25em 0.15em);
}

.fa-pull-left {
  float: left;
  margin-right: var(--fa-pull-margin, 0.3em);
}

.fa-pull-right {
  float: right;
  margin-left: var(--fa-pull-margin, 0.3em);
}

.fa-beat {
  animation-name: fa-beat;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-bounce {
  animation-name: fa-bounce;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.28, 0.84, 0.42, 1));
}

.fa-fade {
  animation-name: fa-fade;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
}

.fa-beat-fade {
  animation-name: fa-beat-fade;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
}

.fa-flip {
  animation-name: fa-flip;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-shake {
  animation-name: fa-shake;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin {
  animation-name: fa-spin;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 2s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin-reverse {
  --fa-animation-direction: reverse;
}

.fa-pulse,
.fa-spin-pulse {
  animation-name: fa-spin;
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, steps(8));
}

@media (prefers-reduced-motion: reduce) {
  .fa-beat,
.fa-bounce,
.fa-fade,
.fa-beat-fade,
.fa-flip,
.fa-pulse,
.fa-shake,
.fa-spin,
.fa-spin-pulse {
    animation-delay: -1ms;
    animation-duration: 1ms;
    animation-iteration-count: 1;
    transition-delay: 0s;
    transition-duration: 0s;
  }
}
@keyframes fa-beat {
  0%, 90% {
    transform: scale(1);
  }
  45% {
    transform: scale(var(--fa-beat-scale, 1.25));
  }
}
@keyframes fa-bounce {
  0% {
    transform: scale(1, 1) translateY(0);
  }
  10% {
    transform: scale(var(--fa-bounce-start-scale-x, 1.1), var(--fa-bounce-start-scale-y, 0.9)) translateY(0);
  }
  30% {
    transform: scale(var(--fa-bounce-jump-scale-x, 0.9), var(--fa-bounce-jump-scale-y, 1.1)) translateY(var(--fa-bounce-height, -0.5em));
  }
  50% {
    transform: scale(var(--fa-bounce-land-scale-x, 1.05), var(--fa-bounce-land-scale-y, 0.95)) translateY(0);
  }
  57% {
    transform: scale(1, 1) translateY(var(--fa-bounce-rebound, -0.125em));
  }
  64% {
    transform: scale(1, 1) translateY(0);
  }
  100% {
    transform: scale(1, 1) translateY(0);
  }
}
@keyframes fa-fade {
  50% {
    opacity: var(--fa-fade-opacity, 0.4);
  }
}
@keyframes fa-beat-fade {
  0%, 100% {
    opacity: var(--fa-beat-fade-opacity, 0.4);
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(var(--fa-beat-fade-scale, 1.125));
  }
}
@keyframes fa-flip {
  50% {
    transform: rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -180deg));
  }
}
@keyframes fa-shake {
  0% {
    transform: rotate(-15deg);
  }
  4% {
    transform: rotate(15deg);
  }
  8%, 24% {
    transform: rotate(-18deg);
  }
  12%, 28% {
    transform: rotate(18deg);
  }
  16% {
    transform: rotate(-22deg);
  }
  20% {
    transform: rotate(22deg);
  }
  32% {
    transform: rotate(-12deg);
  }
  36% {
    transform: rotate(12deg);
  }
  40%, 100% {
    transform: rotate(0deg);
  }
}
@keyframes fa-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.fa-rotate-90 {
  transform: rotate(90deg);
}

.fa-rotate-180 {
  transform: rotate(180deg);
}

.fa-rotate-270 {
  transform: rotate(270deg);
}

.fa-flip-horizontal {
  transform: scale(-1, 1);
}

.fa-flip-vertical {
  transform: scale(1, -1);
}

.fa-flip-both,
.fa-flip-horizontal.fa-flip-vertical {
  transform: scale(-1, -1);
}

.fa-rotate-by {
  transform: rotate(var(--fa-rotate-angle, 0));
}

.fa-stack {
  display: inline-block;
  vertical-align: middle;
  height: 2em;
  position: relative;
  width: 2.5em;
}

.fa-stack-1x,
.fa-stack-2x {
  bottom: 0;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 0;
  z-index: var(--fa-stack-z-index, auto);
}

.svg-inline--fa.fa-stack-1x {
  height: 1em;
  width: 1.25em;
}
.svg-inline--fa.fa-stack-2x {
  height: 2em;
  width: 2.5em;
}

.fa-inverse {
  color: var(--fa-inverse, #fff);
}

.sr-only,
.fa-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only-focusable:not(:focus),
.fa-sr-only-focusable:not(:focus) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.svg-inline--fa .fa-primary {
  fill: var(--fa-primary-color, currentColor);
  opacity: var(--fa-primary-opacity, 1);
}

.svg-inline--fa .fa-secondary {
  fill: var(--fa-secondary-color, currentColor);
  opacity: var(--fa-secondary-opacity, 0.4);
}

.svg-inline--fa.fa-swap-opacity .fa-primary {
  opacity: var(--fa-secondary-opacity, 0.4);
}

.svg-inline--fa.fa-swap-opacity .fa-secondary {
  opacity: var(--fa-primary-opacity, 1);
}

.svg-inline--fa mask .fa-primary,
.svg-inline--fa mask .fa-secondary {
  fill: black;
}`;function Ue(){const t=Me,e=Le,n=f.cssPrefix,a=f.replacementClass;let r=pa;if(n!==t||a!==e){const i=new RegExp("\\.".concat(t,"\\-"),"g"),s=new RegExp("\\--".concat(t,"\\-"),"g"),o=new RegExp("\\.".concat(e),"g");r=r.replace(i,".".concat(n,"-")).replace(s,"--".concat(n,"-")).replace(o,".".concat(a))}return r}let ee=!1;function dt(){f.autoAddCss&&!ee&&(ca(Ue()),ee=!0)}var ha={mixout(){return{dom:{css:Ue,insertCss:dt}}},hooks(){return{beforeDOMElementCreation(){dt()},beforeI2svg(){dt()}}}};const N=M||{};N[C]||(N[C]={});N[C].styles||(N[C].styles={});N[C].hooks||(N[C].hooks={});N[C].shims||(N[C].shims=[]);var I=N[C];const We=[],He=function(){y.removeEventListener("DOMContentLoaded",He),at=1,We.map(t=>t())};let at=!1;_&&(at=(y.documentElement.doScroll?/^loaded|^c/:/^loaded|^i|^c/).test(y.readyState),at||y.addEventListener("DOMContentLoaded",He));function ba(t){_&&(at?setTimeout(t,0):We.push(t))}function J(t){const{tag:e,attributes:n={},children:a=[]}=t;return typeof t=="string"?Ye(t):"<".concat(e," ").concat(da(n),">").concat(a.map(J).join(""),"</").concat(e,">")}function ne(t,e,n){if(t&&t[e]&&t[e][n])return{prefix:e,iconName:n,icon:t[e][n]}}var mt=function(e,n,a,r){var i=Object.keys(e),s=i.length,o=n,d,c,u;for(a===void 0?(d=1,u=e[i[0]]):(d=0,u=a);d<s;d++)c=i[d],u=o(u,e[c],c,e);return u};function ya(t){const e=[];let n=0;const a=t.length;for(;n<a;){const r=t.charCodeAt(n++);if(r>=55296&&r<=56319&&n<a){const i=t.charCodeAt(n++);(i&64512)==56320?e.push(((r&1023)<<10)+(i&1023)+65536):(e.push(r),n--)}else e.push(r)}return e}function Pt(t){const e=ya(t);return e.length===1?e[0].toString(16):null}function va(t,e){const n=t.length;let a=t.charCodeAt(e),r;return a>=55296&&a<=56319&&n>e+1&&(r=t.charCodeAt(e+1),r>=56320&&r<=57343)?(a-55296)*1024+r-56320+65536:a}function ae(t){return Object.keys(t).reduce((e,n)=>{const a=t[n];return!!a.icon?e[a.iconName]=a.icon:e[n]=a,e},{})}function St(t,e){let n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{};const{skipHooks:a=!1}=n,r=ae(e);typeof I.hooks.addPack=="function"&&!a?I.hooks.addPack(t,ae(e)):I.styles[t]=l(l({},I.styles[t]||{}),r),t==="fas"&&St("fa",e)}const{styles:Q,shims:xa}=I,Ge=Object.keys(Dt),Aa=Ge.reduce((t,e)=>(t[e]=Object.keys(Dt[e]),t),{});let Yt=null,Xe={},Ve={},Be={},qe={},Ke={};function ka(t){return~sa.indexOf(t)}function wa(t,e){const n=e.split("-"),a=n[0],r=n.slice(1).join("-");return a===t&&r!==""&&!ka(r)?r:null}const Qe=()=>{const t=a=>mt(Q,(r,i,s)=>(r[s]=mt(i,a,{}),r),{});Xe=t((a,r,i)=>(r[3]&&(a[r[3]]=i),r[2]&&r[2].filter(o=>typeof o=="number").forEach(o=>{a[o.toString(16)]=i}),a)),Ve=t((a,r,i)=>(a[i]=i,r[2]&&r[2].filter(o=>typeof o=="string").forEach(o=>{a[o]=i}),a)),Ke=t((a,r,i)=>{const s=r[2];return a[i]=i,s.forEach(o=>{a[o]=i}),a});const e="far"in Q||f.autoFetchSvg,n=mt(xa,(a,r)=>{const i=r[0];let s=r[1];const o=r[2];return s==="far"&&!e&&(s="fas"),typeof i=="string"&&(a.names[i]={prefix:s,iconName:o}),typeof i=="number"&&(a.unicodes[i.toString(16)]={prefix:s,iconName:o}),a},{names:{},unicodes:{}});Be=n.names,qe=n.unicodes,Yt=ot(f.styleDefault,{family:f.familyDefault})};fa(t=>{Yt=ot(t.styleDefault,{family:f.familyDefault})});Qe();function Ut(t,e){return(Xe[t]||{})[e]}function Pa(t,e){return(Ve[t]||{})[e]}function j(t,e){return(Ke[t]||{})[e]}function Ze(t){return Be[t]||{prefix:null,iconName:null}}function Sa(t){const e=qe[t],n=Ut("fas",t);return e||(n?{prefix:"fas",iconName:n}:null)||{prefix:null,iconName:null}}function L(){return Yt}const Je=()=>({prefix:null,iconName:null,rest:[]});function Ea(t){let e=P;const n=Ge.reduce((a,r)=>(a[r]="".concat(f.cssPrefix,"-").concat(r),a),{});return Te.forEach(a=>{(t.includes(n[a])||t.some(r=>Aa[a].includes(r)))&&(e=a)}),e}function ot(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};const{family:n=P}=e,a=ea[n][t];if(n===it&&!t)return"fad";const r=te[n][t]||te[n][a],i=t in I.styles?t:null;return r||i||null}function Oa(t){let e=[],n=null;return t.forEach(a=>{const r=wa(f.cssPrefix,a);r?n=r:a&&e.push(a)}),{iconName:n,rest:e}}function re(t){return t.sort().filter((e,n,a)=>a.indexOf(e)===n)}function lt(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};const{skipLookups:n=!1}=e;let a=null;const r=yt.concat(Hn),i=re(t.filter(g=>r.includes(g))),s=re(t.filter(g=>!yt.includes(g))),o=i.filter(g=>(a=g,!_e.includes(g))),[d=null]=o,c=Ea(i),u=l(l({},Oa(s)),{},{prefix:ot(d,{family:c})});return l(l(l({},u),_a({values:t,family:c,styles:Q,config:f,canonical:u,givenPrefix:a})),Ia(n,a,u))}function Ia(t,e,n){let{prefix:a,iconName:r}=n;if(t||!a||!r)return{prefix:a,iconName:r};const i=e==="fa"?Ze(r):{},s=j(a,r);return r=i.iconName||s||r,a=i.prefix||a,a==="far"&&!Q.far&&Q.fas&&!f.autoFetchSvg&&(a="fas"),{prefix:a,iconName:r}}const Ca=Te.filter(t=>t!==P||t!==it),Na=Object.keys(bt).filter(t=>t!==P).map(t=>Object.keys(bt[t])).flat();function _a(t){const{values:e,family:n,canonical:a,givenPrefix:r="",styles:i={},config:s={}}=t,o=n===it,d=e.includes("fa-duotone")||e.includes("fad"),c=s.familyDefault==="duotone",u=a.prefix==="fad"||a.prefix==="fa-duotone";if(!o&&(d||c||u)&&(a.prefix="fad"),(e.includes("fa-brands")||e.includes("fab"))&&(a.prefix="fab"),!a.prefix&&Ca.includes(n)&&(Object.keys(i).find(m=>Na.includes(m))||s.autoFetchSvg)){const m=Ln.get(n).defaultShortPrefixId;a.prefix=m,a.iconName=j(a.prefix,a.iconName)||a.iconName}return(a.prefix==="fa"||r==="fa")&&(a.prefix=L()||"fas"),a}class Ta{constructor(){this.definitions={}}add(){for(var e=arguments.length,n=new Array(e),a=0;a<e;a++)n[a]=arguments[a];const r=n.reduce(this._pullDefinitions,{});Object.keys(r).forEach(i=>{this.definitions[i]=l(l({},this.definitions[i]||{}),r[i]),St(i,r[i]);const s=Dt[P][i];s&&St(s,r[i]),Qe()})}reset(){this.definitions={}}_pullDefinitions(e,n){const a=n.prefix&&n.iconName&&n.icon?{0:n}:n;return Object.keys(a).map(r=>{const{prefix:i,iconName:s,icon:o}=a[r],d=o[2];e[i]||(e[i]={}),d.length>0&&d.forEach(c=>{typeof c=="string"&&(e[i][c]=o)}),e[i][s]=o}),e}}let ie=[],W={};const H={},Fa=Object.keys(H);function Ma(t,e){let{mixoutsTo:n}=e;return ie=t,W={},Object.keys(H).forEach(a=>{Fa.indexOf(a)===-1&&delete H[a]}),ie.forEach(a=>{const r=a.mixout?a.mixout():{};if(Object.keys(r).forEach(i=>{typeof r[i]=="function"&&(n[i]=r[i]),typeof r[i]=="object"&&Object.keys(r[i]).forEach(s=>{n[i]||(n[i]={}),n[i][s]=r[i][s]})}),a.hooks){const i=a.hooks();Object.keys(i).forEach(s=>{W[s]||(W[s]=[]),W[s].push(i[s])})}a.provides&&a.provides(H)}),n}function Et(t,e){for(var n=arguments.length,a=new Array(n>2?n-2:0),r=2;r<n;r++)a[r-2]=arguments[r];return(W[t]||[]).forEach(s=>{e=s.apply(null,[e,...a])}),e}function U(t){for(var e=arguments.length,n=new Array(e>1?e-1:0),a=1;a<e;a++)n[a-1]=arguments[a];(W[t]||[]).forEach(i=>{i.apply(null,n)})}function R(){const t=arguments[0],e=Array.prototype.slice.call(arguments,1);return H[t]?H[t].apply(null,e):void 0}function Ot(t){t.prefix==="fa"&&(t.prefix="fas");let{iconName:e}=t;const n=t.prefix||L();if(e)return e=j(n,e)||e,ne($e.definitions,n,e)||ne(I.styles,n,e)}const $e=new Ta,La=()=>{f.autoReplaceSvg=!1,f.observeMutations=!1,U("noAuto")},Ra={i2svg:function(){let t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};return _?(U("beforeI2svg",t),R("pseudoElements2svg",t),R("i2svg",t)):Promise.reject(new Error("Operation requires a DOM of some kind."))},watch:function(){let t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};const{autoReplaceSvgRoot:e}=t;f.autoReplaceSvg===!1&&(f.autoReplaceSvg=!0),f.observeMutations=!0,ba(()=>{za({autoReplaceSvgRoot:e}),U("watch",t)})}},Da={icon:t=>{if(t===null)return null;if(typeof t=="object"&&t.prefix&&t.iconName)return{prefix:t.prefix,iconName:j(t.prefix,t.iconName)||t.iconName};if(Array.isArray(t)&&t.length===2){const e=t[1].indexOf("fa-")===0?t[1].slice(3):t[1],n=ot(t[0]);return{prefix:n,iconName:j(n,e)||e}}if(typeof t=="string"&&(t.indexOf("".concat(f.cssPrefix,"-"))>-1||t.match(na))){const e=lt(t.split(" "),{skipLookups:!0});return{prefix:e.prefix||L(),iconName:j(e.prefix,e.iconName)||e.iconName}}if(typeof t=="string"){const e=L();return{prefix:e,iconName:j(e,t)||t}}}},E={noAuto:La,config:f,dom:Ra,parse:Da,library:$e,findIconDefinition:Ot,toHtml:J},za=function(){let t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};const{autoReplaceSvgRoot:e=y}=t;(Object.keys(I.styles).length>0||f.autoFetchSvg)&&_&&f.autoReplaceSvg&&E.dom.i2svg({node:e})};function ft(t,e){return Object.defineProperty(t,"abstract",{get:e}),Object.defineProperty(t,"html",{get:function(){return t.abstract.map(n=>J(n))}}),Object.defineProperty(t,"node",{get:function(){if(!_)return;const n=y.createElement("div");return n.innerHTML=t.html,n.children}}),t}function ja(t){let{children:e,main:n,mask:a,attributes:r,styles:i,transform:s}=t;if(jt(s)&&n.found&&!a.found){const{width:o,height:d}=n,c={x:o/d/2,y:.5};r.style=st(l(l({},i),{},{"transform-origin":"".concat(c.x+s.x/16,"em ").concat(c.y+s.y/16,"em")}))}return[{tag:"svg",attributes:r,children:e}]}function Ya(t){let{prefix:e,iconName:n,children:a,attributes:r,symbol:i}=t;const s=i===!0?"".concat(e,"-").concat(f.cssPrefix,"-").concat(n):i;return[{tag:"svg",attributes:{style:"display: none;"},children:[{tag:"symbol",attributes:l(l({},r),{},{id:s}),children:a}]}]}function Wt(t){const{icons:{main:e,mask:n},prefix:a,iconName:r,transform:i,symbol:s,title:o,maskId:d,titleId:c,extra:u,watchable:g=!1}=t,{width:m,height:v}=n.found?n:e,S=Yn.includes(a),k=[f.replacementClass,r?"".concat(f.cssPrefix,"-").concat(r):""].filter(T=>u.classes.indexOf(T)===-1).filter(T=>T!==""||!!T).concat(u.classes).join(" ");let b={children:[],attributes:l(l({},u.attributes),{},{"data-prefix":a,"data-icon":r,class:k,role:u.attributes.role||"img",xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 ".concat(m," ").concat(v)})};const x=S&&!~u.classes.indexOf("fa-fw")?{width:"".concat(m/v*16*.0625,"em")}:{};g&&(b.attributes[Y]=""),o&&(b.children.push({tag:"title",attributes:{id:b.attributes["aria-labelledby"]||"title-".concat(c||K())},children:[o]}),delete b.attributes.title);const h=l(l({},b),{},{prefix:a,iconName:r,main:e,mask:n,maskId:d,transform:i,symbol:s,styles:l(l({},x),u.styles)}),{children:A,attributes:w}=n.found&&e.found?R("generateAbstractMask",h)||{children:[],attributes:{}}:R("generateAbstractIcon",h)||{children:[],attributes:{}};return h.children=A,h.attributes=w,s?Ya(h):ja(h)}function se(t){const{content:e,width:n,height:a,transform:r,title:i,extra:s,watchable:o=!1}=t,d=l(l(l({},s.attributes),i?{title:i}:{}),{},{class:s.classes.join(" ")});o&&(d[Y]="");const c=l({},s.styles);jt(r)&&(c.transform=ga({transform:r,startCentered:!0,width:n,height:a}),c["-webkit-transform"]=c.transform);const u=st(c);u.length>0&&(d.style=u);const g=[];return g.push({tag:"span",attributes:d,children:[e]}),i&&g.push({tag:"span",attributes:{class:"sr-only"},children:[i]}),g}function Ua(t){const{content:e,title:n,extra:a}=t,r=l(l(l({},a.attributes),n?{title:n}:{}),{},{class:a.classes.join(" ")}),i=st(a.styles);i.length>0&&(r.style=i);const s=[];return s.push({tag:"span",attributes:r,children:[e]}),n&&s.push({tag:"span",attributes:{class:"sr-only"},children:[n]}),s}const{styles:gt}=I;function It(t){const e=t[0],n=t[1],[a]=t.slice(4);let r=null;return Array.isArray(a)?r={tag:"g",attributes:{class:"".concat(f.cssPrefix,"-").concat(ut.GROUP)},children:[{tag:"path",attributes:{class:"".concat(f.cssPrefix,"-").concat(ut.SECONDARY),fill:"currentColor",d:a[0]}},{tag:"path",attributes:{class:"".concat(f.cssPrefix,"-").concat(ut.PRIMARY),fill:"currentColor",d:a[1]}}]}:r={tag:"path",attributes:{fill:"currentColor",d:a}},{found:!0,width:e,height:n,icon:r}}const Wa={found:!1,width:512,height:512};function Ha(t,e){!Re&&!f.showMissingIcons&&t&&console.error('Icon with name "'.concat(t,'" and prefix "').concat(e,'" is missing.'))}function Ct(t,e){let n=e;return e==="fa"&&f.styleDefault!==null&&(e=L()),new Promise((a,r)=>{if(n==="fa"){const i=Ze(t)||{};t=i.iconName||t,e=i.prefix||e}if(t&&e&&gt[e]&&gt[e][t]){const i=gt[e][t];return a(It(i))}Ha(t,e),a(l(l({},Wa),{},{icon:f.showMissingIcons&&t?R("missingIconAbstract")||{}:{}}))})}const oe=()=>{},Nt=f.measurePerformance&&$&&$.mark&&$.measure?$:{mark:oe,measure:oe},V='FA "6.7.2"',Ga=t=>(Nt.mark("".concat(V," ").concat(t," begins")),()=>tn(t)),tn=t=>{Nt.mark("".concat(V," ").concat(t," ends")),Nt.measure("".concat(V," ").concat(t),"".concat(V," ").concat(t," begins"),"".concat(V," ").concat(t," ends"))};var Ht={begin:Ga,end:tn};const et=()=>{};function le(t){return typeof(t.getAttribute?t.getAttribute(Y):null)=="string"}function Xa(t){const e=t.getAttribute?t.getAttribute(Lt):null,n=t.getAttribute?t.getAttribute(Rt):null;return e&&n}function Va(t){return t&&t.classList&&t.classList.contains&&t.classList.contains(f.replacementClass)}function Ba(){return f.autoReplaceSvg===!0?nt.replace:nt[f.autoReplaceSvg]||nt.replace}function qa(t){return y.createElementNS("http://www.w3.org/2000/svg",t)}function Ka(t){return y.createElement(t)}function en(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};const{ceFn:n=t.tag==="svg"?qa:Ka}=e;if(typeof t=="string")return y.createTextNode(t);const a=n(t.tag);return Object.keys(t.attributes||[]).forEach(function(i){a.setAttribute(i,t.attributes[i])}),(t.children||[]).forEach(function(i){a.appendChild(en(i,{ceFn:n}))}),a}function Qa(t){let e=" ".concat(t.outerHTML," ");return e="".concat(e,"Font Awesome fontawesome.com "),e}const nt={replace:function(t){const e=t[0];if(e.parentNode)if(t[1].forEach(n=>{e.parentNode.insertBefore(en(n),e)}),e.getAttribute(Y)===null&&f.keepOriginalSource){let n=y.createComment(Qa(e));e.parentNode.replaceChild(n,e)}else e.remove()},nest:function(t){const e=t[0],n=t[1];if(~zt(e).indexOf(f.replacementClass))return nt.replace(t);const a=new RegExp("".concat(f.cssPrefix,"-.*"));if(delete n[0].attributes.id,n[0].attributes.class){const i=n[0].attributes.class.split(" ").reduce((s,o)=>(o===f.replacementClass||o.match(a)?s.toSvg.push(o):s.toNode.push(o),s),{toNode:[],toSvg:[]});n[0].attributes.class=i.toSvg.join(" "),i.toNode.length===0?e.removeAttribute("class"):e.setAttribute("class",i.toNode.join(" "))}const r=n.map(i=>J(i)).join(`
`);e.setAttribute(Y,""),e.innerHTML=r}};function fe(t){t()}function nn(t,e){const n=typeof e=="function"?e:et;if(t.length===0)n();else{let a=fe;f.mutateApproach===$n&&(a=M.requestAnimationFrame||fe),a(()=>{const r=Ba(),i=Ht.begin("mutate");t.map(r),i(),n()})}}let Gt=!1;function an(){Gt=!0}function _t(){Gt=!1}let rt=null;function ce(t){if(!Qt||!f.observeMutations)return;const{treeCallback:e=et,nodeCallback:n=et,pseudoElementsCallback:a=et,observeMutationsRoot:r=y}=t;rt=new Qt(i=>{if(Gt)return;const s=L();X(i).forEach(o=>{if(o.type==="childList"&&o.addedNodes.length>0&&!le(o.addedNodes[0])&&(f.searchPseudoElements&&a(o.target),e(o.target)),o.type==="attributes"&&o.target.parentNode&&f.searchPseudoElements&&a(o.target.parentNode),o.type==="attributes"&&le(o.target)&&~ia.indexOf(o.attributeName))if(o.attributeName==="class"&&Xa(o.target)){const{prefix:d,iconName:c}=lt(zt(o.target));o.target.setAttribute(Lt,d||s),c&&o.target.setAttribute(Rt,c)}else Va(o.target)&&n(o.target)})}),_&&rt.observe(r,{childList:!0,attributes:!0,characterData:!0,subtree:!0})}function Za(){rt&&rt.disconnect()}function Ja(t){const e=t.getAttribute("style");let n=[];return e&&(n=e.split(";").reduce((a,r)=>{const i=r.split(":"),s=i[0],o=i.slice(1);return s&&o.length>0&&(a[s]=o.join(":").trim()),a},{})),n}function $a(t){const e=t.getAttribute("data-prefix"),n=t.getAttribute("data-icon"),a=t.innerText!==void 0?t.innerText.trim():"";let r=lt(zt(t));return r.prefix||(r.prefix=L()),e&&n&&(r.prefix=e,r.iconName=n),r.iconName&&r.prefix||(r.prefix&&a.length>0&&(r.iconName=Pa(r.prefix,t.innerText)||Ut(r.prefix,Pt(t.innerText))),!r.iconName&&f.autoFetchSvg&&t.firstChild&&t.firstChild.nodeType===Node.TEXT_NODE&&(r.iconName=t.firstChild.data)),r}function tr(t){const e=X(t.attributes).reduce((r,i)=>(r.name!=="class"&&r.name!=="style"&&(r[i.name]=i.value),r),{}),n=t.getAttribute("title"),a=t.getAttribute("data-fa-title-id");return f.autoA11y&&(n?e["aria-labelledby"]="".concat(f.replacementClass,"-title-").concat(a||K()):(e["aria-hidden"]="true",e.focusable="false")),e}function er(){return{iconName:null,title:null,titleId:null,prefix:null,transform:O,symbol:!1,mask:{iconName:null,prefix:null,rest:[]},maskId:null,extra:{classes:[],styles:{},attributes:{}}}}function ue(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{styleParser:!0};const{iconName:n,prefix:a,rest:r}=$a(t),i=tr(t),s=Et("parseNodeAttributes",{},t);let o=e.styleParser?Ja(t):[];return l({iconName:n,title:t.getAttribute("title"),titleId:t.getAttribute("data-fa-title-id"),prefix:a,transform:O,mask:{iconName:null,prefix:null,rest:[]},maskId:null,symbol:!1,extra:{classes:r,styles:o,attributes:i}},s)}const{styles:nr}=I;function rn(t){const e=f.autoReplaceSvg==="nest"?ue(t,{styleParser:!1}):ue(t);return~e.extra.classes.indexOf(ze)?R("generateLayersText",t,e):R("generateSvgReplacementMutation",t,e)}function ar(){return[...Dn,...yt]}function de(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:null;if(!_)return Promise.resolve();const n=y.documentElement.classList,a=u=>n.add("".concat($t,"-").concat(u)),r=u=>n.remove("".concat($t,"-").concat(u)),i=f.autoFetchSvg?ar():_e.concat(Object.keys(nr));i.includes("fa")||i.push("fa");const s=[".".concat(ze,":not([").concat(Y,"])")].concat(i.map(u=>".".concat(u,":not([").concat(Y,"])"))).join(", ");if(s.length===0)return Promise.resolve();let o=[];try{o=X(t.querySelectorAll(s))}catch{}if(o.length>0)a("pending"),r("complete");else return Promise.resolve();const d=Ht.begin("onTree"),c=o.reduce((u,g)=>{try{const m=rn(g);m&&u.push(m)}catch(m){Re||m.name==="MissingIcon"&&console.error(m)}return u},[]);return new Promise((u,g)=>{Promise.all(c).then(m=>{nn(m,()=>{a("active"),a("complete"),r("pending"),typeof e=="function"&&e(),d(),u()})}).catch(m=>{d(),g(m)})})}function rr(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:null;rn(t).then(n=>{n&&nn([n],e)})}function ir(t){return function(e){let n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};const a=(e||{}).icon?e:Ot(e||{});let{mask:r}=n;return r&&(r=(r||{}).icon?r:Ot(r||{})),t(a,l(l({},n),{},{mask:r}))}}const sr=function(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};const{transform:n=O,symbol:a=!1,mask:r=null,maskId:i=null,title:s=null,titleId:o=null,classes:d=[],attributes:c={},styles:u={}}=e;if(!t)return;const{prefix:g,iconName:m,icon:v}=t;return ft(l({type:"icon"},t),()=>(U("beforeDOMElementCreation",{iconDefinition:t,params:e}),f.autoA11y&&(s?c["aria-labelledby"]="".concat(f.replacementClass,"-title-").concat(o||K()):(c["aria-hidden"]="true",c.focusable="false")),Wt({icons:{main:It(v),mask:r?It(r.icon):{found:!1,width:null,height:null,icon:{}}},prefix:g,iconName:m,transform:l(l({},O),n),symbol:a,title:s,maskId:i,titleId:o,extra:{attributes:c,styles:u,classes:d}})))};var or={mixout(){return{icon:ir(sr)}},hooks(){return{mutationObserverCallbacks(t){return t.treeCallback=de,t.nodeCallback=rr,t}}},provides(t){t.i2svg=function(e){const{node:n=y,callback:a=()=>{}}=e;return de(n,a)},t.generateSvgReplacementMutation=function(e,n){const{iconName:a,title:r,titleId:i,prefix:s,transform:o,symbol:d,mask:c,maskId:u,extra:g}=n;return new Promise((m,v)=>{Promise.all([Ct(a,s),c.iconName?Ct(c.iconName,c.prefix):Promise.resolve({found:!1,width:512,height:512,icon:{}})]).then(S=>{let[k,b]=S;m([e,Wt({icons:{main:k,mask:b},prefix:s,iconName:a,transform:o,symbol:d,maskId:u,title:r,titleId:i,extra:g,watchable:!0})])}).catch(v)})},t.generateAbstractIcon=function(e){let{children:n,attributes:a,main:r,transform:i,styles:s}=e;const o=st(s);o.length>0&&(a.style=o);let d;return jt(i)&&(d=R("generateAbstractTransformGrouping",{main:r,transform:i,containerWidth:r.width,iconWidth:r.width})),n.push(d||r.icon),{children:n,attributes:a}}}},lr={mixout(){return{layer(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};const{classes:n=[]}=e;return ft({type:"layer"},()=>{U("beforeDOMElementCreation",{assembler:t,params:e});let a=[];return t(r=>{Array.isArray(r)?r.map(i=>{a=a.concat(i.abstract)}):a=a.concat(r.abstract)}),[{tag:"span",attributes:{class:["".concat(f.cssPrefix,"-layers"),...n].join(" ")},children:a}]})}}}},fr={mixout(){return{counter(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};const{title:n=null,classes:a=[],attributes:r={},styles:i={}}=e;return ft({type:"counter",content:t},()=>(U("beforeDOMElementCreation",{content:t,params:e}),Ua({content:t.toString(),title:n,extra:{attributes:r,styles:i,classes:["".concat(f.cssPrefix,"-layers-counter"),...a]}})))}}}},cr={mixout(){return{text(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};const{transform:n=O,title:a=null,classes:r=[],attributes:i={},styles:s={}}=e;return ft({type:"text",content:t},()=>(U("beforeDOMElementCreation",{content:t,params:e}),se({content:t,transform:l(l({},O),n),title:a,extra:{attributes:i,styles:s,classes:["".concat(f.cssPrefix,"-layers-text"),...r]}})))}}},provides(t){t.generateLayersText=function(e,n){const{title:a,transform:r,extra:i}=n;let s=null,o=null;if(Ce){const d=parseInt(getComputedStyle(e).fontSize,10),c=e.getBoundingClientRect();s=c.width/d,o=c.height/d}return f.autoA11y&&!a&&(i.attributes["aria-hidden"]="true"),Promise.resolve([e,se({content:e.innerHTML,width:s,height:o,transform:r,title:a,extra:i,watchable:!0})])}}};const ur=new RegExp('"',"ug"),me=[1105920,1112319],ge=l(l(l(l({},{FontAwesome:{normal:"fas",400:"fas"}}),Mn),Zn),Gn),Tt=Object.keys(ge).reduce((t,e)=>(t[e.toLowerCase()]=ge[e],t),{}),dr=Object.keys(Tt).reduce((t,e)=>{const n=Tt[e];return t[e]=n[900]||[...Object.entries(n)][0][1],t},{});function mr(t){const e=t.replace(ur,""),n=va(e,0),a=n>=me[0]&&n<=me[1],r=e.length===2?e[0]===e[1]:!1;return{value:Pt(r?e[0]:e),isSecondary:a||r}}function gr(t,e){const n=t.replace(/^['"]|['"]$/g,"").toLowerCase(),a=parseInt(e),r=isNaN(a)?"normal":a;return(Tt[n]||{})[r]||dr[n]}function pe(t,e){const n="".concat(Jn).concat(e.replace(":","-"));return new Promise((a,r)=>{if(t.getAttribute(n)!==null)return a();const s=X(t.children).filter(m=>m.getAttribute(xt)===e)[0],o=M.getComputedStyle(t,e),d=o.getPropertyValue("font-family"),c=d.match(aa),u=o.getPropertyValue("font-weight"),g=o.getPropertyValue("content");if(s&&!c)return t.removeChild(s),a();if(c&&g!=="none"&&g!==""){const m=o.getPropertyValue("content");let v=gr(d,u);const{value:S,isSecondary:k}=mr(m),b=c[0].startsWith("FontAwesome");let x=Ut(v,S),h=x;if(b){const A=Sa(S);A.iconName&&A.prefix&&(x=A.iconName,v=A.prefix)}if(x&&!k&&(!s||s.getAttribute(Lt)!==v||s.getAttribute(Rt)!==h)){t.setAttribute(n,h),s&&t.removeChild(s);const A=er(),{extra:w}=A;w.attributes[xt]=e,Ct(x,v).then(T=>{const D=Wt(l(l({},A),{},{icons:{main:T,mask:Je()},prefix:v,iconName:h,extra:w,watchable:!0})),z=y.createElementNS("http://www.w3.org/2000/svg","svg");e==="::before"?t.insertBefore(z,t.firstChild):t.appendChild(z),z.outerHTML=D.map(ct=>J(ct)).join(`
`),t.removeAttribute(n),a()}).catch(r)}else a()}else a()})}function pr(t){return Promise.all([pe(t,"::before"),pe(t,"::after")])}function hr(t){return t.parentNode!==document.head&&!~ta.indexOf(t.tagName.toUpperCase())&&!t.getAttribute(xt)&&(!t.parentNode||t.parentNode.tagName!=="svg")}function he(t){if(_)return new Promise((e,n)=>{const a=X(t.querySelectorAll("*")).filter(hr).map(pr),r=Ht.begin("searchPseudoElements");an(),Promise.all(a).then(()=>{r(),_t(),e()}).catch(()=>{r(),_t(),n()})})}var br={hooks(){return{mutationObserverCallbacks(t){return t.pseudoElementsCallback=he,t}}},provides(t){t.pseudoElements2svg=function(e){const{node:n=y}=e;f.searchPseudoElements&&he(n)}}};let be=!1;var yr={mixout(){return{dom:{unwatch(){an(),be=!0}}}},hooks(){return{bootstrap(){ce(Et("mutationObserverCallbacks",{}))},noAuto(){Za()},watch(t){const{observeMutationsRoot:e}=t;be?_t():ce(Et("mutationObserverCallbacks",{observeMutationsRoot:e}))}}}};const ye=t=>{let e={size:16,x:0,y:0,flipX:!1,flipY:!1,rotate:0};return t.toLowerCase().split(" ").reduce((n,a)=>{const r=a.toLowerCase().split("-"),i=r[0];let s=r.slice(1).join("-");if(i&&s==="h")return n.flipX=!0,n;if(i&&s==="v")return n.flipY=!0,n;if(s=parseFloat(s),isNaN(s))return n;switch(i){case"grow":n.size=n.size+s;break;case"shrink":n.size=n.size-s;break;case"left":n.x=n.x-s;break;case"right":n.x=n.x+s;break;case"up":n.y=n.y-s;break;case"down":n.y=n.y+s;break;case"rotate":n.rotate=n.rotate+s;break}return n},e)};var vr={mixout(){return{parse:{transform:t=>ye(t)}}},hooks(){return{parseNodeAttributes(t,e){const n=e.getAttribute("data-fa-transform");return n&&(t.transform=ye(n)),t}}},provides(t){t.generateAbstractTransformGrouping=function(e){let{main:n,transform:a,containerWidth:r,iconWidth:i}=e;const s={transform:"translate(".concat(r/2," 256)")},o="translate(".concat(a.x*32,", ").concat(a.y*32,") "),d="scale(".concat(a.size/16*(a.flipX?-1:1),", ").concat(a.size/16*(a.flipY?-1:1),") "),c="rotate(".concat(a.rotate," 0 0)"),u={transform:"".concat(o," ").concat(d," ").concat(c)},g={transform:"translate(".concat(i/2*-1," -256)")},m={outer:s,inner:u,path:g};return{tag:"g",attributes:l({},m.outer),children:[{tag:"g",attributes:l({},m.inner),children:[{tag:n.icon.tag,children:n.icon.children,attributes:l(l({},n.icon.attributes),m.path)}]}]}}}};const pt={x:0,y:0,width:"100%",height:"100%"};function ve(t){let e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!0;return t.attributes&&(t.attributes.fill||e)&&(t.attributes.fill="black"),t}function xr(t){return t.tag==="g"?t.children:[t]}var Ar={hooks(){return{parseNodeAttributes(t,e){const n=e.getAttribute("data-fa-mask"),a=n?lt(n.split(" ").map(r=>r.trim())):Je();return a.prefix||(a.prefix=L()),t.mask=a,t.maskId=e.getAttribute("data-fa-mask-id"),t}}},provides(t){t.generateAbstractMask=function(e){let{children:n,attributes:a,main:r,mask:i,maskId:s,transform:o}=e;const{width:d,icon:c}=r,{width:u,icon:g}=i,m=ma({transform:o,containerWidth:u,iconWidth:d}),v={tag:"rect",attributes:l(l({},pt),{},{fill:"white"})},S=c.children?{children:c.children.map(ve)}:{},k={tag:"g",attributes:l({},m.inner),children:[ve(l({tag:c.tag,attributes:l(l({},c.attributes),m.path)},S))]},b={tag:"g",attributes:l({},m.outer),children:[k]},x="mask-".concat(s||K()),h="clip-".concat(s||K()),A={tag:"mask",attributes:l(l({},pt),{},{id:x,maskUnits:"userSpaceOnUse",maskContentUnits:"userSpaceOnUse"}),children:[v,b]},w={tag:"defs",children:[{tag:"clipPath",attributes:{id:h},children:xr(g)},A]};return n.push(w,{tag:"rect",attributes:l({fill:"currentColor","clip-path":"url(#".concat(h,")"),mask:"url(#".concat(x,")")},pt)}),{children:n,attributes:a}}}},kr={provides(t){let e=!1;M.matchMedia&&(e=M.matchMedia("(prefers-reduced-motion: reduce)").matches),t.missingIconAbstract=function(){const n=[],a={fill:"currentColor"},r={attributeType:"XML",repeatCount:"indefinite",dur:"2s"};n.push({tag:"path",attributes:l(l({},a),{},{d:"M156.5,447.7l-12.6,29.5c-18.7-9.5-35.9-21.2-51.5-34.9l22.7-22.7C127.6,430.5,141.5,440,156.5,447.7z M40.6,272H8.5 c1.4,21.2,5.4,41.7,11.7,61.1L50,321.2C45.1,305.5,41.8,289,40.6,272z M40.6,240c1.4-18.8,5.2-37,11.1-54.1l-29.5-12.6 C14.7,194.3,10,216.7,8.5,240H40.6z M64.3,156.5c7.8-14.9,17.2-28.8,28.1-41.5L69.7,92.3c-13.7,15.6-25.5,32.8-34.9,51.5 L64.3,156.5z M397,419.6c-13.9,12-29.4,22.3-46.1,30.4l11.9,29.8c20.7-9.9,39.8-22.6,56.9-37.6L397,419.6z M115,92.4 c13.9-12,29.4-22.3,46.1-30.4l-11.9-29.8c-20.7,9.9-39.8,22.6-56.8,37.6L115,92.4z M447.7,355.5c-7.8,14.9-17.2,28.8-28.1,41.5 l22.7,22.7c13.7-15.6,25.5-32.9,34.9-51.5L447.7,355.5z M471.4,272c-1.4,18.8-5.2,37-11.1,54.1l29.5,12.6 c7.5-21.1,12.2-43.5,13.6-66.8H471.4z M321.2,462c-15.7,5-32.2,8.2-49.2,9.4v32.1c21.2-1.4,41.7-5.4,61.1-11.7L321.2,462z M240,471.4c-18.8-1.4-37-5.2-54.1-11.1l-12.6,29.5c21.1,7.5,43.5,12.2,66.8,13.6V471.4z M462,190.8c5,15.7,8.2,32.2,9.4,49.2h32.1 c-1.4-21.2-5.4-41.7-11.7-61.1L462,190.8z M92.4,397c-12-13.9-22.3-29.4-30.4-46.1l-29.8,11.9c9.9,20.7,22.6,39.8,37.6,56.9 L92.4,397z M272,40.6c18.8,1.4,36.9,5.2,54.1,11.1l12.6-29.5C317.7,14.7,295.3,10,272,8.5V40.6z M190.8,50 c15.7-5,32.2-8.2,49.2-9.4V8.5c-21.2,1.4-41.7,5.4-61.1,11.7L190.8,50z M442.3,92.3L419.6,115c12,13.9,22.3,29.4,30.5,46.1 l29.8-11.9C470,128.5,457.3,109.4,442.3,92.3z M397,92.4l22.7-22.7c-15.6-13.7-32.8-25.5-51.5-34.9l-12.6,29.5 C370.4,72.1,384.4,81.5,397,92.4z"})});const i=l(l({},r),{},{attributeName:"opacity"}),s={tag:"circle",attributes:l(l({},a),{},{cx:"256",cy:"364",r:"28"}),children:[]};return e||s.children.push({tag:"animate",attributes:l(l({},r),{},{attributeName:"r",values:"28;14;28;28;14;28;"})},{tag:"animate",attributes:l(l({},i),{},{values:"1;0;1;1;0;1;"})}),n.push(s),n.push({tag:"path",attributes:l(l({},a),{},{opacity:"1",d:"M263.7,312h-16c-6.6,0-12-5.4-12-12c0-71,77.4-63.9,77.4-107.8c0-20-17.8-40.2-57.4-40.2c-29.1,0-44.3,9.6-59.2,28.7 c-3.9,5-11.1,6-16.2,2.4l-13.1-9.2c-5.6-3.9-6.9-11.8-2.6-17.2c21.2-27.2,46.4-44.7,91.2-44.7c52.3,0,97.4,29.8,97.4,80.2 c0,67.6-77.4,63.5-77.4,107.8C275.7,306.6,270.3,312,263.7,312z"}),children:e?[]:[{tag:"animate",attributes:l(l({},i),{},{values:"1;0;0;0;0;1;"})}]}),e||n.push({tag:"path",attributes:l(l({},a),{},{opacity:"0",d:"M232.5,134.5l7,168c0.3,6.4,5.6,11.5,12,11.5h9c6.4,0,11.7-5.1,12-11.5l7-168c0.3-6.8-5.2-12.5-12-12.5h-23 C237.7,122,232.2,127.7,232.5,134.5z"}),children:[{tag:"animate",attributes:l(l({},i),{},{values:"0;0;1;1;0;0;"})}]}),{tag:"g",attributes:{class:"missing"},children:n}}}},wr={hooks(){return{parseNodeAttributes(t,e){const n=e.getAttribute("data-fa-symbol"),a=n===null?!1:n===""?!0:n;return t.symbol=a,t}}}},Pr=[ha,or,lr,fr,cr,br,yr,vr,Ar,kr,wr];Ma(Pr,{mixoutsTo:E});E.noAuto;E.config;const zr=E.library;E.dom;const Ft=E.parse;E.findIconDefinition;E.toHtml;const Sr=E.icon;E.layer;E.text;E.counter;let sn=!1;try{sn=!0}catch{}function Er(...t){!sn&&console&&typeof console.error=="function"&&console.error(...t)}function xe(t){if(t&&typeof t=="object"&&t.prefix&&t.iconName&&t.icon)return t;if(Ft.icon)return Ft.icon(t);if(t===null)return null;if(t&&typeof t=="object"&&t.prefix&&t.iconName)return t;if(Array.isArray(t)&&t.length===2)return{prefix:t[0],iconName:t[1]};if(typeof t=="string")return{prefix:"fas",iconName:t}}function ht(t,e){return Array.isArray(e)&&e.length>0||!Array.isArray(e)&&e?{[t]:e}:{}}var Or=ln("<svg><!></svg>");function Ir(t,e){var k;ke(e,!1);let n=p(e,"tag",8),a=p(e,"props",8),r=p(e,"children",8),i=p(e,"style",8,null),s=p(e,"ref",12,null);if(n()!=="svg")throw new Error('SvgElement requires a tag of "svg"');function o(b){return(b==null?void 0:b.reduce((x,h)=>x+(h.tag?d(h):h),""))||""}function d({tag:b,props:x,children:h}){const A=Object.keys(x).map(w=>`${w}="${x[w]}"`).join(" ");return`<${b} ${A}>${o(h)}</${b}>`}const c=o(r()),u=(k=a())!=null&&k.style?`${a().style}${i()||""}`:i(),g={...a(),style:u};Pe();var m=Or();let v;var S=cn(m);yn(S,()=>c,!0,!1),un(m),xn(m,b=>s(b),()=>s()),dn(()=>v=vn(m,v,{...g},void 0,!0)),Ae(t,m),we()}function jr(t,e){const n=Vt(e,["children","$$slots","$$events","$$legacy"]),a=Vt(n,["border","mask","maskId","fixedWidth","inverse","flip","icon","listItem","pull","pulse","rotation","size","spin","spinPulse","spinReverse","beat","fade","beatFade","bounce","shake","symbol","title","titleId","transform","swapOpacity","ref","style"]);ke(e,!1),p(e,"border",8,!1);let r=p(e,"mask",8,null),i=p(e,"maskId",8,null);p(e,"fixedWidth",8,!1),p(e,"inverse",8,!1),p(e,"flip",8,!1);let s=p(e,"icon",8,null);p(e,"listItem",8,!1),p(e,"pull",8,null),p(e,"pulse",8,!1),p(e,"rotation",8,null),p(e,"size",8,null),p(e,"spin",8,!1),p(e,"spinPulse",8,!1),p(e,"spinReverse",8,!1),p(e,"beat",8,!1),p(e,"fade",8,!1),p(e,"beatFade",8,!1),p(e,"bounce",8,!1),p(e,"shake",8,!1);let o=p(e,"symbol",8,!1),d=p(e,"title",8,""),c=p(e,"titleId",8,null),u=p(e,"transform",8,null);p(e,"swapOpacity",8,!1);let g=p(e,"ref",12,null),m=p(e,"style",8,null);const v=xe(s()),S=ht("classes",[...An(n),...(n.class||"").split(" ")]),k=ht("transform",typeof u()=="string"?Ft.transform(u()):u()),b=ht("mask",xe(r())),x=Sr(v,{...S,...k,...b,symbol:o(),title:d(),titleId:c(),maskId:i()});let h=pn(null);if(!x)Er("Could not find icon",v);else{const{abstract:D}=x;mn(h,Se((z,ct,on)=>({tag:z,props:ct,children:on}),D[0],a))}Pe();var A=fn(),w=gn(A);{var T=D=>{Ir(D,bn(()=>Xt(h),{get style(){return m()},get ref(){return g()},set ref(z){g(z)},$$legacy:!0}))};hn(w,D=>{Xt(h)&&D(T)})}Ae(t,A),we()}export{jr as F,zr as l};
