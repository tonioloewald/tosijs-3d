import{Lr as l}from"./site-r6nbve0k.js";import{jt as s,kt as u}from"./site-bab0thfc.js";import{fG as a}from"./site-pcap36fe.js";class n extends l{constructor(e){super(s,e);this.config=e,this.object=this.registerDataInput("object",s,e.object),this.propertyName=this.registerDataInput("propertyName",u,e.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",s)}_doOperation(e){let o=this.customGetFunction.getValue(e),r;if(o)r=o(this.object.getValue(e),this.propertyName.getValue(e),e);else{let t=this.object.getValue(e),p=this.propertyName.getValue(e);r=t&&p?this._getPropertyValue(t,p):void 0}return r}_getPropertyValue(e,o){let r=o.split("."),t=e;for(let p of r)if(t=t[p],t===void 0)return;return t}getClassName(){return"FlowGraphGetPropertyBlock"}}var i=!1;function h(){if(i)return;i=!0,a("FlowGraphGetPropertyBlock",n)}h();
export{n as jo,h as ko};

//# debugId=00329F36381A7D5C64756E2164756E21
//# sourceMappingURL=site-7hn1pxya.js.map
