import{Br as u}from"./site-d8tyq8af.js";import{ct as o}from"./site-vtjqk0se.js";import{dt as l,jt as r}from"./site-bab0thfc.js";import{fG as s}from"./site-pcap36fe.js";class p extends o{constructor(e){super(e);this.config=e,this.array=this.registerDataInput("array",r),this.index=this.registerDataInput("index",r,new l(-1)),this.value=this.registerDataOutput("value",r)}_updateOutputs(e){let t=this.array.getValue(e),a=u(this.index.getValue(e));if(t&&a>=0&&a<t.length)this.value.setValue(t[a],e);else this.value.setValue(null,e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphArrayIndexBlock"}}var i=!1;function n(){if(i)return;i=!0,s("FlowGraphArrayIndexBlock",p)}n();
export{p as vn,n as wn};

//# debugId=08D793FB00FD1A5A64756E2164756E21
//# sourceMappingURL=site-hay604nv.js.map
