import{$e}from"./site-x0v5x8t1.js";import{Ye,w,qt}from"./site-5stwdw2k.js";import{o}from"./site-4gwmbhmj.js";class Cm extends $e{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",w),this.array=this.registerDataInput("array",w),this.index=this.registerDataOutput("index",qt,new Ye(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new Ye(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function Am(){if(t)return;t=!0,o("FlowGraphIndexOfBlock",Cm)}Am();
export{Cm,Am};

//# debugId=0A249BF915D7B8BD64756E2164756E21
//# sourceMappingURL=site-r4tv7x2s.js.map
