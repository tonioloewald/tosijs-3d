import{w,Fr}from"./site-8r8s7x74.js";import{pr}from"./site-et27qp9r.js";import{o}from"./site-twypjy9n.js";class Pg extends pr{constructor(e){super(w,e);this.config=e,this.object=this.registerDataInput("object",w,e.object),this.propertyName=this.registerDataInput("propertyName",Fr,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",w)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function Mg(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",Pg)}Mg();
export{Pg,Mg};

//# debugId=FDB33FD3F813031B64756E2164756E21
//# sourceMappingURL=site-683xhcs7.js.map
