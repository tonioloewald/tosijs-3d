import{I,Dr}from"./site-a5xw8xz8.js";import{lr}from"./site-74jpvqnk.js";import{a}from"./site-2e9r9891.js";class f_ extends lr{constructor(e){super(I,e);this.config=e,this.object=this.registerDataInput("object",I,e.object),this.propertyName=this.registerDataInput("propertyName",Dr,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",I)}_doOperation(e){let o=this.customGetFunction.getValue(e),r;if(o)r=o(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),p=this.propertyName.getValue(e);r=t&&p?this._getPropertyValue(t,p):void 0}return r}_getPropertyValue(e,o){let r=o.split("."),t=e;for(let p of r)if(t=t[p],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var s=!1;function d_(){if(s)return;s=!0,a("FlowGraphGetPropertyBlock",f_)}d_();
export{f_,d_};

//# debugId=04729463658EDB6C64756E2164756E21
//# sourceMappingURL=site-byhew6f6.js.map
