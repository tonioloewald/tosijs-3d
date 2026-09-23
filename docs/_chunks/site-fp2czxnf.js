import{Dr as u}from"./site-rpgg5q6n.js";import{et as o}from"./site-gyw9fqwj.js";import{ft as l,lt as r}from"./site-rrva3mwb.js";import{hG as s}from"./site-qd0cy957.js";class p extends o{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",r),this.index=this.registerDataInput("index",r,new l(-1)),this.value=this.registerDataOutput("value",r)}_updateOutputs(e){let t=this.array.getValue(e),a=u(this.index.getValue(e));if(t&&a>=0&&a<t.length)this.value.setValue(t[a],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var i=!1;function n(){if(i)return;i=!0,s("FlowGraphArrayIndexBlock",p)}n();
export{p as xn,n as yn};

//# debugId=99035C761C0D80D664756E2164756E21
//# sourceMappingURL=site-fp2czxnf.js.map
