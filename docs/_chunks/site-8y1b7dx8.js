import{du as p}from"./site-e325gqfj.js";import{eu as r,ku as t,xu as a}from"./site-86tpqddf.js";import{sE as o}from"./site-yf4sr5jd.js";class l extends p{constructor(e){super(e);this.config=e,this.object=this.registerDataInput("object",t),this.array=this.registerDataInput("array",t),this.index=this.registerDataOutput("index",a,new r(-1))}_updateOutputs(e){let h=this.object.getValue(e),i=this.array.getValue(e);if(i)this.index.setValue(new r(i.indexOf(h)),e)}serialize(e){super.serialize(e)}getClassName(){return"FlowGraphIndexOfBlock"}}var s=!1;function n(){if(s)return;s=!0,o("FlowGraphIndexOfBlock",l)}n();
export{l as qn,n as rn};

//# debugId=D88305F4BAB26D3664756E2164756E21
//# sourceMappingURL=site-8y1b7dx8.js.map
