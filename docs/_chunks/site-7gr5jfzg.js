import{Sr as p}from"./site-kt00xh7b.js";import{as as s}from"./site-gg0bpfht.js";import{du as a}from"./site-e325gqfj.js";import{eu as o,ku as t}from"./site-86tpqddf.js";import{sE as i}from"./site-yf4sr5jd.js";class l extends a{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",t,e.type),this.value=this.registerDataOutput("value",t),this.index=this.registerDataInput("index",t,new o(s(e.index??-1)))}_updateOutputs(e){let h=this.type.getValue(e),n=this.index.getValue(e),m=p(e.assetsContext,h,s(n),this.config.useIndexAsUniqueId);this.value.setValue(m,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var r=!1;function u(){if(r)return;r=!0,i("FlowGraphGetAssetBlock",l)}u();
export{l as So,u as To};

//# debugId=0E7BCCC9D28202ED64756E2164756E21
//# sourceMappingURL=site-7gr5jfzg.js.map
