import mongoose, { Document,Schema } from "mongoose";
import bcrypt from "bcryptjs";
export interface IUser extends Document{
    username: string,
    email: string,
    password: string,
    isVerified: boolean,
    displayName?: string,
    avatar?: string,
    provider?: "local" | "google" | "github",
    providerId?: string,
    verifyToken?: string,
    verifyTokenExpires?: Date,
    resetToken?: string,
    resetTokenExpires?: Date,
    comparePassword(candidatePassword: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
    {
        username:{type:String, required: true, unique: true, trim:  true},
        email:{type:String, required: true, unique: true, lowercase:true, trim: true},
        password:{type:String, required: true, minlength: 8},
        isVerified:{type: Boolean, default: false},
        displayName:{type:String, trim: true, maxlength: 80},
        avatar:{type:String, maxlength: 1000},
        provider:{type:String, enum: ["local", "google", "github"], default: "local"},
        providerId:{type:String},
        verifyToken:{type:String},
        verifyTokenExpires:{type:Date},
        resetToken:{type:String},
        resetTokenExpires:{type:Date},
    },
    {timestamps: true}
);

//hashing password before using

UserSchema.pre("save", async function() {
    if(!this.isModified("password")) return ;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    // next(); cant use this next with async await function
} );

UserSchema.methods.comparePassword = async function(
    candidatePassword: string
): Promise<boolean>{
    return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>("User", UserSchema);