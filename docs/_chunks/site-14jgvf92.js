import{vl,Ye}from"./site-23z3qe8v.js";import{lp}from"./site-xp6e2pbe.js";import{o}from"./site-6fgvbfwz.js";class f_ extends Ye{constructor(t){super(t);this.config=t,this.output=this.registerDataOutput("output",lp(t.value))}_updateOutputs(t){this.output.setValue(this.config.value,t)}getClassName(){return"FlowGraphConstantBlock"}serialize(t={},r=vl){super.serialize(t),r("value",this.config.value,t.config)}}var e=!1;function d_(){if(e)return;e=!0,o("FlowGraphConstantBlock",f_)}d_();
export{f_,d_};

//# debugId=155605A04AA771E964756E2164756E21
//# sourceMappingURL=site-14jgvf92.js.map
