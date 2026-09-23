import{Ip as p}from"./site-x4w0akaq.js";import{Dr as s}from"./site-rpgg5q6n.js";import{et as a}from"./site-gyw9fqwj.js";import{ft as o,lt as t}from"./site-rrva3mwb.js";import{hG as i}from"./site-qd0cy957.js";class l extends a{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",t,e.type),this.value=this.registerDataOutput("value",t),this.index=this.registerDataInput("index",t,new o(s(e.index??-1)))}_updateOutputs(e){let h=this.type.getValue(e),n=this.index.getValue(e),m=p(e.assetsContext,h,s(n),this.config.useIndexAsUniqueId);this.value.setValue(m,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var r=!1;function u(){if(r)return;r=!0,i("FlowGraphGetAssetBlock",l)}u();
export{l as jo,u as ko};

//# debugId=1D6F4AD184E736FB64756E2164756E21
//# sourceMappingURL=site-y399c6ax.js.map
