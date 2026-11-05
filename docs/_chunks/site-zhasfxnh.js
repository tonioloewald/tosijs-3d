import{O,Fr}from"./site-fszd7aez.js";import{fr}from"./site-2msfrcp9.js";import{o}from"./site-9mf4pzsy.js";class yg extends fr{constructor(e){super(O,e);this.config=e,this.object=this.registerDataInput("object",O,e.object),this.propertyName=this.registerDataInput("propertyName",Fr,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",O)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function Tg(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",yg)}Tg();
export{yg,Tg};

//# debugId=2D56C5E8DFAF564C64756E2164756E21
//# sourceMappingURL=site-zhasfxnh.js.map
