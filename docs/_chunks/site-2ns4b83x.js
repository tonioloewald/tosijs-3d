import{P,Nr}from"./site-ec8w6gnd.js";import{dr}from"./site-7skzcdjc.js";import{o}from"./site-jv2cv0ev.js";class __ extends dr{constructor(e){super(P,e);this.config=e,this.object=this.registerDataInput("object",P,e.object),this.propertyName=this.registerDataInput("propertyName",Nr,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",P)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function g_(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",__)}g_();
export{__,g_};

//# debugId=A0F4C14F55BA910864756E2164756E21
//# sourceMappingURL=site-2ns4b83x.js.map
