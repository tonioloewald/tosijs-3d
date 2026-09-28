import{I,Lr}from"./site-wsw4wdqb.js";import{cr}from"./site-v9d7a0gx.js";import{a}from"./site-3ge18yeb.js";class f_ extends cr{constructor(e){super(I,e);this.config=e,this.object=this.registerDataInput("object",I,e.object),this.propertyName=this.registerDataInput("propertyName",Lr,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",I)}_doOperation(e){let o=this.customGetFunction.getValue(e),r;if(o)r=o(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),p=this.propertyName.getValue(e);r=t&&p?this._getPropertyValue(t,p):void 0}return r}_getPropertyValue(e,o){let r=o.split("."),t=e;for(let p of r)if(t=t[p],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var s=!1;function d_(){if(s)return;s=!0,a("FlowGraphGetPropertyBlock",f_)}d_();
export{f_,d_};

//# debugId=2D9C714A87BDCAC364756E2164756E21
//# sourceMappingURL=site-cv8hpmv6.js.map
