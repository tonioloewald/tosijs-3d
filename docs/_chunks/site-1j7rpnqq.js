import{as as u}from"./site-gg0bpfht.js";import{du as o}from"./site-e325gqfj.js";import{eu as l,ku as r}from"./site-86tpqddf.js";import{sE as s}from"./site-yf4sr5jd.js";class p extends o{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",r),this.index=this.registerDataInput("index",r,new l(-1)),this.value=this.registerDataOutput("value",r)}_updateOutputs(e){let t=this.array.getValue(e),a=u(this.index.getValue(e));if(t&&a>=0&&a<t.length)this.value.setValue(t[a],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var i=!1;function n(){if(i)return;i=!0,s("FlowGraphArrayIndexBlock",p)}n();
export{p as nn,n as on};

//# debugId=3C7506761F91F59E64756E2164756E21
//# sourceMappingURL=site-1j7rpnqq.js.map
