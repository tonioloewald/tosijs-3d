import{R,_r}from"./site-b66xxmk6.js";import{qi}from"./site-e67myaz5.js";import{a}from"./site-pey1240t.js";class Zp extends qi{constructor(e){super(R,e);this.config=e,this.object=this.registerDataInput("object",R,e.object),this.propertyName=this.registerDataInput("propertyName",_r,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",R)}_doOperation(e){let o=this.customGetFunction.getValue(e),r;if(o)r=o(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),p=this.propertyName.getValue(e);r=t&&p?this._getPropertyValue(t,p):void 0}return r}_getPropertyValue(e,o){let r=o.split("."),t=e;for(let p of r)if(t=t[p],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var s=!1;function Jp(){if(s)return;s=!0,a("FlowGraphGetPropertyBlock",Zp)}Jp();
export{Zp,Jp};

//# debugId=B90A4BF36913A1C664756E2164756E21
//# sourceMappingURL=site-f706c91p.js.map
