import{P,Br}from"./site-fn6dg0m5.js";import{fr}from"./site-qb4nmqee.js";import{o}from"./site-eq7hsr33.js";class gg extends fr{constructor(e){super(P,e);this.config=e,this.object=this.registerDataInput("object",P,e.object),this.propertyName=this.registerDataInput("propertyName",Br,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",P)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function _g(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",gg)}_g();
export{gg,_g};

//# debugId=5AF44BB1CC05B94964756E2164756E21
//# sourceMappingURL=site-ean071pf.js.map
