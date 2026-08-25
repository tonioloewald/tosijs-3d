import{gr as l}from"./site-5b5dj8md.js";import{ku as s,lu as u}from"./site-86tpqddf.js";import{sE as a}from"./site-yf4sr5jd.js";class n extends l{constructor(e){super(s,e);this.config=e,this.object=this.registerDataInput("object",s,e.object),this.propertyName=this.registerDataInput("propertyName",u,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",s)}_doOperation(e){let o=this.customGetFunction.getValue(e),r;if(o)r=o(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),p=this.propertyName.getValue(e);r=t&&p?this._getPropertyValue(t,p):void 0}return r}_getPropertyValue(e,o){let r=o.split("."),t=e;for(let p of r)if(t=t[p],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function h(){if(i)return;i=!0,a("FlowGraphGetPropertyBlock",n)}h();
export{n as Uo,h as Vo};

//# debugId=F956338AFC2DB03364756E2164756E21
//# sourceMappingURL=site-1qtqy3tg.js.map
