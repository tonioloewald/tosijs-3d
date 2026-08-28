import{Gp as p}from"./site-acje88n4.js";import{Br as s}from"./site-d8tyq8af.js";import{ct as a}from"./site-vtjqk0se.js";import{dt as o,jt as t}from"./site-bab0thfc.js";import{fG as i}from"./site-pcap36fe.js";class l extends a{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",t,e.type),this.value=this.registerDataOutput("value",t),this.index=this.registerDataInput("index",t,new o(s(e.index??-1)))}_updateOutputs(e){let h=this.type.getValue(e),n=this.index.getValue(e),m=p(e.assetsContext,h,s(n),this.config.useIndexAsUniqueId);this.value.setValue(m,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var r=!1;function u(){if(r)return;r=!0,i("FlowGraphGetAssetBlock",l)}u();
export{l as ho,u as io};

//# debugId=B8DEFBDD1C39150264756E2164756E21
//# sourceMappingURL=site-czpyhks7.js.map
