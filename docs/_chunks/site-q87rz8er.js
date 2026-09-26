import{mc,ze,Jt}from"./site-z8mqhr1b.js";import{Ve,R}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Qp extends ze{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",R,e.type),this.value=this.registerDataOutput("value",R),this.index=this.registerDataInput("index",R,new Ve(Jt(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=mc(e.assetsContext,s,Jt(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function Kp(){if(t)return;t=!0,a("FlowGraphGetAssetBlock",Qp)}Kp();
export{Qp,Kp};

//# debugId=A46B40335F69634764756E2164756E21
//# sourceMappingURL=site-q87rz8er.js.map
