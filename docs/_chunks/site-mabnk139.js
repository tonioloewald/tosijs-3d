import{I,Dr}from"./site-xp6e2pbe.js";import{hr}from"./site-7gt3d30d.js";import{o}from"./site-6fgvbfwz.js";class x_ extends hr{constructor(e){super(I,e);this.config=e,this.object=this.registerDataInput("object",I,e.object),this.propertyName=this.registerDataInput("propertyName",Dr,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",I)}_doOperation(e){let p=this.customGetFunction.getValue(e),r;if(p)r=p(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),s=this.propertyName.getValue(e);r=t&&s?this._getPropertyValue(t,s):void 0}return r}_getPropertyValue(e,p){let r=p.split("."),t=e;for(let s of r)if(t=t[s],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function v_(){if(i)return;i=!0,o("FlowGraphGetPropertyBlock",x_)}v_();
export{x_,v_};

//# debugId=2F57BD33202303CB64756E2164756E21
//# sourceMappingURL=site-mabnk139.js.map
