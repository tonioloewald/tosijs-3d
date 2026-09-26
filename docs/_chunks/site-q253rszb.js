import{Qe}from"./site-z8mqhr1b.js";import{R,ct}from"./site-b66xxmk6.js";import{a}from"./site-pey1240t.js";class Qd extends Qe{constructor(t){super(t);this.body=this.registerDataInput("body",R),this.force=this.registerDataInput("force",ct),this.location=this.registerDataInput("location",ct)}_execute(t,s){let o=this.body.getValue(t);if(!o){this._reportError(t,"No physics body provided"),this.out._activateSignal(t);return}let e=this.force.getValue(t),i=this.location.getValue(t);o.applyForce(e,i),this.out._activateSignal(t)}getClassName(){return"FlowGraphApplyForceBlock"}}var r=!1;function Kd(){if(r)return;r=!0,a("FlowGraphApplyForceBlock",Qd)}Kd();
export{Qd,Kd};

//# debugId=D7EF741680CC78D464756E2164756E21
//# sourceMappingURL=site-q253rszb.js.map
