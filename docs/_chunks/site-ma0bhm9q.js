import{w,Fr}from"./site-g82qva8f.js";import{pr}from"./site-bvxmxrt1.js";import{o}from"./site-3cf5tsfq.js";class Eg extends pr{constructor(e){super(w,e);this.config=e,this.object=this.registerDataInput("object",w,e.object),this.propertyName=this.registerDataInput("propertyName",Fr,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",w)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function Rg(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",Eg)}Rg();
export{Eg,Rg};

//# debugId=EEB6E388630859AF64756E2164756E21
//# sourceMappingURL=site-ma0bhm9q.js.map
