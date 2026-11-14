import{$e}from"./site-3t3g319r.js";import{Ye,w,qt}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class ym extends $e{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",w),this.array=this.registerDataInput("array",w),this.index=this.registerDataOutput("index",qt,new Ye(-1))}_updateOutputs(e){let i=this.object.getValue(e),r=this.array.getValue(e);if(r)this.index.setValue(new Ye(r.indexOf(i)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var t=!1;function Tm(){if(t)return;t=!0,o("FlowGraphIndexOfBlock",ym)}Tm();
export{ym,Tm};

//# debugId=E010FD69536B4BD264756E2164756E21
//# sourceMappingURL=site-cxvtyaec.js.map
