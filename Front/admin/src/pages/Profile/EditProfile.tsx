import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import UserProfileForm from "../../components/UserProfile/UserProfileForm";

export default function EditProfile() {
  return (
    <>
      <PageMeta
        title="Edit Profile | SmartHire"
        description="Update your profile information"
      />
      <PageBreadcrumb pageTitle="Edit Profile" />
      
      <div className="space-y-6">
        <UserProfileForm />
      </div>
    </>
  );
} 