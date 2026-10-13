import{P,Dr}from"./site-9sh5dtm0.js";import{hr}from"./site-0ff9et4a.js";import{o}from"./site-zrw6ygjx.js";class x_ extends hr{constructor(e){super(P,e);this.config=e,this.object=this.registerDataInput("object",P,e.object),this.propertyName=this.registerDataInput("propertyName",Dr,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",P)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function v_(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",x_)}v_();
export{x_,v_};

//# debugId=0F766224F16CC6D464756E2164756E21
//# sourceMappingURL=site-skvbb1nw.js.map
