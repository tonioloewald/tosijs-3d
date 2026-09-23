import{Nr as l}from"./site-5bn779tj.js";import{lt as s,mt as u}from"./site-rrva3mwb.js";import{hG as a}from"./site-qd0cy957.js";class n extends l{constructor(e){super(s,e);this.config=e,this.object=this.registerDataInput("object",s,e.object),this.propertyName=this.registerDataInput("propertyName",u,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",s)}_doOperation(e){let o=this.customGetFunction.getValue(e),r;if(o)r=o(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),p=this.propertyName.getValue(e);r=t&&p?this._getPropertyValue(t,p):void 0}return r}_getPropertyValue(e,o){let r=o.split("."),t=e;for(let p of r)if(t=t[p],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function h(){if(i)return;i=!0,a("FlowGraphGetPropertyBlock",n)}h();
export{n as lo,h as mo};

//# debugId=3C69B9FF589628FE64756E2164756E21
//# sourceMappingURL=site-ahefwbnr.js.map
