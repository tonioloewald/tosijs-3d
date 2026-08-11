import{gr as L}from"./site-m71w6vat.js";import{ku as H,lu as K}from"./site-5mc4escc.js";import{sE as J}from"./site-tvqrtn5a.js";class Q extends L{constructor(b){super(H,b);this.config=b,this.object=this.registerDataInput("object",H,b.object),this.propertyName=this.registerDataInput("propertyName",K,b.propertyName),this.customGetFunction=this.registerDataInput("customGetFunction",H)}_doOperation(b){let D=this.customGetFunction.getValue(b),z;if(D)z=D(this.object.getValue(b),this.propertyName.getValue(b),b);else{let q=this.object.getValue(b),E=this.propertyName.getValue(b);z=q&&E?this._getPropertyValue(q,E):void 0}return z}_getPropertyValue(b,D){let z=D.split("."),q=b;for(let E of z)if(q=q[E],q===void 0)return;return q}getClassName(){return"FlowGraphGetPropertyBlock"}}var I=!1;function U(){if(I)return;I=!0,J("FlowGraphGetPropertyBlock",Q)}U();
export{Q as Uo,U as Vo};

//# debugId=6BE3116CA1D878E564756E2164756E21
//# sourceMappingURL=site-mq40ky3z.js.map
