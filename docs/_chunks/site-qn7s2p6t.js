import{Ye}from"./site-c6g1b76s.js";import{He,I,jt}from"./site-wsw4wdqb.js";import{a}from"./site-3ge18yeb.js";class im extends Ye{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",I),this.array=this.registerDataInput("array",I),this.index=this.registerDataOutput("index",jt,new He(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new He(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function rm(){if(t)return;t=!0,a("FlowGraphIndexOfBlock",im)}rm();
export{im,rm};

//# debugId=988D9A2C0798F76A64756E2164756E21
//# sourceMappingURL=site-qn7s2p6t.js.map
