import{w,Fr}from"./site-6xzhcvhx.js";import{pr}from"./site-hx0m9mkg.js";import{o}from"./site-rtzsfcas.js";class Eg extends pr{constructor(e){super(w,e);this.config=e,this.object=this.registerDataInput("object",w,e.object),this.propertyName=this.registerDataInput("propertyName",Fr,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",w)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function Rg(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",Eg)}Rg();
export{Eg,Rg};

//# debugId=EEB6E388630859AF64756E2164756E21
//# sourceMappingURL=site-ea5681hp.js.map
