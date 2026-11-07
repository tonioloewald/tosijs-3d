import{O,Fr}from"./site-rfjvxq2b.js";import{fr}from"./site-wmjr04ng.js";import{o}from"./site-hcyxrnqg.js";class Ag extends fr{constructor(e){super(O,e);this.config=e,this.object=this.registerDataInput("object",O,e.object),this.propertyName=this.registerDataInput("propertyName",Fr,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",O)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function Eg(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",Ag)}Eg();
export{Ag,Eg};

//# debugId=2D3273B393C8E39864756E2164756E21
//# sourceMappingURL=site-wbgy9r99.js.map
