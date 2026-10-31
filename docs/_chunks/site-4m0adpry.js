import{O,Br}from"./site-ge04ms28.js";import{fr}from"./site-dw7pdcvc.js";import{o}from"./site-bqt5vbzj.js";class vg extends fr{constructor(e){super(O,e);this.config=e,this.object=this.registerDataInput("object",O,e.object),this.propertyName=this.registerDataInput("propertyName",Br,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",O)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function Sg(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",vg)}Sg();
export{vg,Sg};

//# debugId=D0D86C72361E69E664756E2164756E21
//# sourceMappingURL=site-4m0adpry.js.map
