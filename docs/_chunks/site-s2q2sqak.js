import{Ye}from"./site-5tw2831p.js";import{He,I,$t}from"./site-a5xw8xz8.js";import{a}from"./site-2e9r9891.js";class im extends Ye{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",I),this.array=this.registerDataInput("array",I),this.index=this.registerDataOutput("index",$t,new He(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new He(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function rm(){if(t)return;t=!0,a("FlowGraphIndexOfBlock",im)}rm();
export{im,rm};

//# debugId=7ABF48197E59DE8F64756E2164756E21
//# sourceMappingURL=site-s2q2sqak.js.map
