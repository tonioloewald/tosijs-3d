import{as as P}from"./site-fk6vvnk0.js";import{du as L}from"./site-037v9pkv.js";import{eu as K,ku as v}from"./site-5mc4escc.js";import{sE as J}from"./site-tvqrtn5a.js";class Q extends L{constructor(q){super(q);this.config=q,this.array=this.registerDataInput("array",v),this.index=this.registerDataInput("index",v,new K(-1)),this.value=this.registerDataOutput("value",v)}_updateOutputs(q){let D=this.array.getValue(q),E=P(this.index.getValue(q));if(D&&E>=0&&E<D.length)this.value.setValue(D[E],q);else this.value.setValue(null,q)}serialize(q){super.serialize(q)}getClassName(){return"FlowGraphArrayIndexBlock"}}var H=!1;function U(){if(H)return;H=!0,J("FlowGraphArrayIndexBlock",Q)}U();
export{Q as nn,U as on};

//# debugId=CCFF38298E94D42864756E2164756E21
//# sourceMappingURL=site-fwb6wz5d.js.map
