import{P,Br}from"./site-q1pk93qz.js";import{dr}from"./site-efemq5yx.js";import{o}from"./site-synvytjq.js";class __ extends dr{constructor(e){super(P,e);this.config=e,this.object=this.registerDataInput("object",P,e.object),this.propertyName=this.registerDataInput("propertyName",Br,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",P)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function g_(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",__)}g_();
export{__,g_};

//# debugId=2D68FA11CF3A75E264756E2164756E21
//# sourceMappingURL=site-angszfe4.js.map
