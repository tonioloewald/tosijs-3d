import{w,Fr}from"./site-67r40dmn.js";import{pr}from"./site-7n1nc7w0.js";import{o}from"./site-ars0s908.js";class Pg extends pr{constructor(e){super(w,e);this.config=e,this.object=this.registerDataInput("object",w,e.object),this.propertyName=this.registerDataInput("propertyName",Fr,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",w)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function Mg(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",Pg)}Mg();
export{Pg,Mg};

//# debugId=FDB33FD3F813031B64756E2164756E21
//# sourceMappingURL=site-kmr2x7y6.js.map
