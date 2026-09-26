import{ze}from"./site-z8mqhr1b.js";import{Ve,R,Vt}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Ud extends ze{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",R),this.array=this.registerDataInput("array",R),this.index=this.registerDataOutput("index",Vt,new Ve(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new Ve(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function Wd(){if(t)return;t=!0,a("FlowGraphIndexOfBlock",Ud)}Wd();
export{Ud,Wd};

//# debugId=CC767266C5B9643F64756E2164756E21
//# sourceMappingURL=site-ta1stdhz.js.map
