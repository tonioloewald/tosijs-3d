import{w,Fr}from"./site-5stwdw2k.js";import{pr}from"./site-4fs3dhqs.js";import{o}from"./site-4gwmbhmj.js";class Dg extends pr{constructor(e){super(w,e);this.config=e,this.object=this.registerDataInput("object",w,e.object),this.propertyName=this.registerDataInput("propertyName",Fr,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",w)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function Lg(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",Dg)}Lg();
export{Dg,Lg};

//# debugId=50B9D2210B793DFE64756E2164756E21
//# sourceMappingURL=site-8hzz1qr8.js.map
